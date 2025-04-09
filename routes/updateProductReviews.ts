/*
 * Copyright (c) 2014-2025 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import challengeUtils = require('../lib/challengeUtils')
import { type Request, type Response, type NextFunction } from 'express'
import * as db from '../data/mongodb'
import { challenges } from '../data/datacache'

const security = require('../lib/insecurity')

// vuln-code-snippet start noSqlReviewsChallenge forgedReviewChallenge
module.exports = function productReviews () {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = security.authenticatedUsers.from(req)
    const id = String(req.body.id).replace(/[^\w-]+/g, '')
    db.reviewsCollection.update(
        { _id: id },
        { $set: { message: req.body.message } },
        { multi: true }
    ).then(
        (result: { modified: number, original: Array<{ author: any }> }) => {
            challengeUtils.solveIf(challenges.noSqlReviewsChallenge, () => { return result.modified > 1 })
            challengeUtils.solveIf(challenges.forgedReviewChallenge, () => {
               return user?.data && result.original[0] && result.original[0].author !== user.data.email && result.modified === 1
            })
            res.json(result)
        }, (err: unknown) => {
            res.status(500).json(err)
        })
    }
}
// vuln-code-snippet end noSqlReviewsChallenge forgedReviewChallenge
