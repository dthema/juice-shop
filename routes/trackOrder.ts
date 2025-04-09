/*
 * Copyright (c) 2014-2025 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import utils = require('../lib/utils')
import challengeUtils = require('../lib/challengeUtils')
import { type Request, type Response } from 'express'
import * as db from '../data/mongodb'
import { challenges } from '../data/datacache'

module.exports = function trackOrder () {
  return (req: Request, res: Response) => {
    const rawId = req.params.id
    const id = String(rawId).replace(/[^\w-]+/g, '')
    if (!id) {
      return res.status(400).json({ error: 'Invalid order id' })
    }
    challengeUtils.solveIf(challenges.reflectedXssChallenge, () => {
      return utils.contains(id, '<iframe src="javascript:alert(`xss`)">')
    })
    db.ordersCollection.find({ orderId: id }).then((order: any) => {
      const result = utils.queryResultToJson(order)
      challengeUtils.solveIf(challenges.noSqlOrdersChallenge, () => result.data.length > 1)
      if (result.data[0] === undefined) {
        result.data[0] = { orderId: id }
      }
      res.json(result)
    }).catch(() => {
      res.status(400).json({ error: 'Wrong Param' })
    })
  }
}
