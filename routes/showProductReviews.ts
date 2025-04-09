/*
 * Copyright (c) 2014-2025 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import utils = require('../lib/utils')
import challengeUtils = require('../lib/challengeUtils')
import { type Request, type Response, type NextFunction } from 'express'
import { type Review } from 'data/types'
import * as db from '../data/mongodb'
import { challenges } from '../data/datacache'

const security = require('../lib/insecurity')

// Blocking sleep function as in native MongoDB
// @ts-expect-error FIXME Type safety broken for global object
global.sleep = (time: number) => {
  if (time > 2000) {
    time = 2000
  }
  const stop = new Date().getTime()
  while (new Date().getTime() < stop + time) { }
}

module.exports = function productReviews () {
  return (req: Request, res: Response, next: NextFunction) => {
    const rawId = req.params.id
    const id = parseInt(rawId, 10)
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid product id' })
    }

    db.reviewsCollection.find({ product: id }).then((reviews: Review[]) => {
      const t1 = new Date().getTime()
      challengeUtils.solveIf(challenges.noSqlCommandChallenge, () => t1 > 2000)
      const user = security.authenticatedUsers.from(req)
      reviews.forEach(review => {
        if (user === undefined || review.likedBy.includes(user.data.email)) {
          review.liked = true
        }
      })
      res.json(utils.queryResultToJson(reviews))
    }).catch(() => {
      res.status(400).json({ error: 'Wrong Params' })
    })
  }
}
