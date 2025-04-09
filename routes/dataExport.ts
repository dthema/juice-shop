/*
 * Copyright (c) 2014-2025 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { type Request, type Response, type NextFunction } from 'express'
import { MemoryModel } from '../models/memory'
import { type ProductModel } from '../models/product'
import * as db from '../data/mongodb'
import { challenges } from '../data/datacache'

import challengeUtils = require('../lib/challengeUtils')
const security = require('../lib/insecurity')

module.exports = function dataExport () {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers?.authorization
    const token = typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : ''
    if (!token || !/^[\w-]+$/.test(token)) {
      return next(new Error('Invalid or missing authorization token'))
    }
    const loggedInUser = security.authenticatedUsers.get(token)
    if (loggedInUser?.data?.email && loggedInUser.data.id) {
      const username = loggedInUser.data.username
      const email = loggedInUser.data.email
      const updatedEmail = email.replace(/[aeiou]/gi, '*')
      const userData: {
        username: string
        email: string
        orders: Array<{
          orderId: string
          totalPrice: number
          products: ProductModel[]
          bonus: number
          eta: string
        }>
        reviews: Array<{
          message: string
          author: string
          productId: number
          likesCount: number
          likedBy: string
        }>
        memories: Array<{
          imageUrl: string
          caption: string
        }>
      } = {
        username,
        email,
        orders: [],
        reviews: [],
        memories: []
      }

      const userId = parseInt(req.body.UserId, 10)
      if (isNaN(userId)) {
        return next(new Error('Invalid UserId provided'))
      }
      const memories = await MemoryModel.findAll({ where: { UserId: { $eq: Number(userId)} } })
      memories.forEach((memory: MemoryModel) => {
        userData.memories.push({
          imageUrl: req.protocol + '://' + req.get('host') + '/' + memory.imagePath,
          caption: memory.caption
        })
      })

      db.ordersCollection.find({ email: { $eq: String(email) } }).then((orders: Array<{
        orderId: string
        totalPrice: number
        products: ProductModel[]
        bonus: number
        eta: string
      }>) => {
        if (orders.length > 0) {
          orders.forEach(order => {
            userData.orders.push({
              orderId: order.orderId,
              totalPrice: order.totalPrice,
              products: [...order.products],
              bonus: order.bonus,
              eta: order.eta
            })
          })
        }

        db.reviewsCollection.find({ author: { $eq: String(email) } }).then((reviews: Array<{
          message: string
          author: string
          product: number
          likesCount: number
          likedBy: string
        }>) => {
          if (reviews.length > 0) {
            reviews.forEach(review => {
              userData.reviews.push({
                message: review.message,
                author: review.author,
                productId: review.product,
                likesCount: review.likesCount,
                likedBy: review.likedBy
              })
            })
          }
          const emailHash = security.hash(email).slice(0, 4)
          userData.orders.forEach(order => {
            challengeUtils.solveIf(challenges.dataExportChallenge, () => order.orderId.split('-')[0] !== emailHash)
          })
          res.status(200).send({ userData: JSON.stringify(userData, null, 2), confirmation: 'Your data export will open in a new Browser window.' })
        }).catch(() => {
          next(new Error(`Error retrieving reviews for ${email}`))
        })
      }).catch(() => {
        next(new Error(`Error retrieving orders for ${email}`))
      })
    } else {
      next(new Error('Blocked illegal activity by ' + req.socket.remoteAddress))
    }
  }
}
