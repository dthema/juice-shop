/*
 * Copyright (c) 2014-2025 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { type Request, type Response, type NextFunction } from 'express'
import { ordersCollection } from '../data/mongodb'

const security = require('../lib/insecurity')

module.exports.orderHistory = function orderHistory () {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers?.authorization
    const token = typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : ''
    if (!token || !/^[\w-]+$/.test(token)) {
      return next(new Error('Invalid or missing authorization token'))
    }
    const loggedInUser = security.authenticatedUsers.get(token)
    if (loggedInUser?.data?.email && loggedInUser.data.id) {
      const email = loggedInUser.data.email
      const order = await ordersCollection.find({ email: { $eq: String(email) } })
      res.status(200).json({ status: 'success', data: order })
    } else {
      next(new Error('Blocked illegal activity by ' + req.socket.remoteAddress))
    }
  }
}

module.exports.allOrders = function allOrders () {
  return async (req: Request, res: Response, next: NextFunction) => {
    const order = await ordersCollection.find()
    res.status(200).json({ status: 'success', data: order.reverse() })
  }
}

module.exports.toggleDeliveryStatus = function toggleDeliveryStatus () {
  return async (req: Request, res: Response, next: NextFunction) => {
    const deliveryStatus = !req.body.deliveryStatus
    const eta = deliveryStatus ? '0' : '1'
    const sanitizedId = String(req.params.id).replace(/[^\w-]+/g, '')
    if (!sanitizedId) {
      return res.status(400).json({ error: 'Invalid order id' })
    }
    await ordersCollection.update({ _id: sanitizedId }, { $set: { delivered: deliveryStatus, eta } })
    res.status(200).json({ status: 'success' })
  }
}
