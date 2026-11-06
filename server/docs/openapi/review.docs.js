/**
 * OpenAPI documentation extracted from modules/review/api/guest.routes.js
 * and modules/review/api/admin.routes.js.
 *
 * Kept separate from the routers so route files read as routing. swagger-jsdoc
 * discovers this file through the `apis` glob in config/swagger.config.js.
 *
 * Guest routes are mounted at /api/v1/reviews; admin routes at
 * /api/v1/admin/reviews. Every admin route requires a bearer token plus an
 * explicit permission and hotel context (see each operation).
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ReviewUser:
 *       type: object
 *       description: Author of a review (public profile fields only).
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         first_name:
 *           type: string
 *           nullable: true
 *         last_name:
 *           type: string
 *           nullable: true
 *         profile_picture_url:
 *           type: string
 *           nullable: true
 *         country:
 *           type: string
 *           nullable: true
 *     ReviewReplyUser:
 *       type: object
 *       description: Author of a hotel reply (name fields only).
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         first_name:
 *           type: string
 *           nullable: true
 *         last_name:
 *           type: string
 *           nullable: true
 *     ReviewReply:
 *       type: object
 *       description: Hotel owner/manager reply to a review (one per review).
 *       nullable: true
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         reply_text:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         user:
 *           $ref: '#/components/schemas/ReviewReplyUser'
 *     ReviewMedia:
 *       type: object
 *       description: Image or video attached to a review.
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         media_type:
 *           type: string
 *           enum: [image, video]
 *         url:
 *           type: string
 *           description: URL or storage path of the media.
 *         thumbnail_url:
 *           type: string
 *           nullable: true
 *         display_order:
 *           type: integer
 *     ReviewHotel:
 *       type: object
 *       description: Minimal hotel reference included in moderation responses.
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *           nullable: true
 *         city_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *     PublicReview:
 *       type: object
 *       description: A published review as returned on the public hotel listing.
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         rating_overall:
 *           type: number
 *           description: Overall rating on a 1.0-10.0 scale.
 *         rating_cleanliness:
 *           type: number
 *           nullable: true
 *         rating_location:
 *           type: number
 *           nullable: true
 *         rating_service:
 *           type: number
 *           nullable: true
 *         rating_value:
 *           type: number
 *           nullable: true
 *         title:
 *           type: string
 *           nullable: true
 *         comment:
 *           type: string
 *           nullable: true
 *         is_verified:
 *           type: boolean
 *         helpful_count:
 *           type: integer
 *         status:
 *           type: string
 *           enum: [published]
 *         created_at:
 *           type: string
 *           format: date-time
 *         user:
 *           $ref: '#/components/schemas/ReviewUser'
 *         reply:
 *           $ref: '#/components/schemas/ReviewReply'
 *         media:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ReviewMedia'
 *     UserReview:
 *       type: object
 *       description: A review authored by the authenticated user (all statuses).
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         hotel_id:
 *           type: string
 *           format: uuid
 *         booking_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         rating_overall:
 *           type: number
 *         title:
 *           type: string
 *           nullable: true
 *         comment:
 *           type: string
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [published, hidden, deleted]
 *         is_verified:
 *           type: boolean
 *         helpful_count:
 *           type: integer
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         hotel:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             name:
 *               type: string
 *               nullable: true
 *         user:
 *           $ref: '#/components/schemas/ReviewUser'
 *         reply:
 *           $ref: '#/components/schemas/ReviewReply'
 *         media:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ReviewMedia'
 *     Review:
 *       type: object
 *       description: Full review row plus related entities, as returned to moderators.
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         user_id:
 *           type: string
 *           format: uuid
 *         hotel_id:
 *           type: string
 *           format: uuid
 *         booking_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         rating_overall:
 *           type: number
 *         rating_cleanliness:
 *           type: number
 *           nullable: true
 *         rating_location:
 *           type: number
 *           nullable: true
 *         rating_service:
 *           type: number
 *           nullable: true
 *         rating_value:
 *           type: number
 *           nullable: true
 *         title:
 *           type: string
 *           nullable: true
 *         comment:
 *           type: string
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [published, hidden, deleted]
 *         is_verified:
 *           type: boolean
 *         helpful_count:
 *           type: integer
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         user:
 *           $ref: '#/components/schemas/ReviewUser'
 *         reply:
 *           $ref: '#/components/schemas/ReviewReply'
 *         media:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ReviewMedia'
 *         hotel:
 *           $ref: '#/components/schemas/ReviewHotel'
 *     ReviewPaginationMeta:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 20
 *         total:
 *           type: integer
 *           example: 42
 *         facets:
 *           type: object
 *           description: Filter options derived from the hotel's published reviews
 *           properties:
 *             countries:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   country:
 *                     type: string
 *                     example: Spain
 *                   count:
 *                     type: integer
 *                     example: 3
 *     ReviewHotelListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PublicReview'
 *         meta:
 *           $ref: '#/components/schemas/ReviewPaginationMeta'
 *     ReviewUserListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/UserReview'
 *         meta:
 *           $ref: '#/components/schemas/ReviewPaginationMeta'
 *     ReviewValidateResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             bookingCode:
 *               type: string
 *             bookingId:
 *               type: string
 *               format: uuid
 *             isValid:
 *               type: boolean
 *               example: true
 *     ReviewCheckResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             exists:
 *               type: boolean
 *               description: True if the completed booking already has a review.
 *             review:
 *               type: object
 *               nullable: true
 *               description: Present only when `exists` is true.
 *               properties:
 *                 review_id:
 *                   type: string
 *                   format: uuid
 *                 rating:
 *                   type: number
 *                 title:
 *                   type: string
 *                   nullable: true
 *                 comment:
 *                   type: string
 *                   nullable: true
 *                 status:
 *                   type: string
 *                   enum: [published, hidden, deleted]
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *     ReviewCreateResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             reviewId:
 *               type: string
 *               format: uuid
 *             status:
 *               type: string
 *               enum: [published]
 *             message:
 *               type: string
 *               example: Review posted successfully
 *     ReviewVoteResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             isHelpful:
 *               type: boolean
 *               nullable: true
 *               description: The caller's vote (null after removal)
 *               example: true
 *             helpfulCount:
 *               type: integer
 *               description: Recomputed number of helpful votes on the review
 *               example: 7
 *     AdminReviewListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Review'
 *         meta:
 *           $ref: '#/components/schemas/ReviewPaginationMeta'
 *     AdminReviewSummaryResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             hotelId:
 *               type: string
 *               format: uuid
 *             totalReviews:
 *               type: integer
 *             byStatus:
 *               type: object
 *               properties:
 *                 published:
 *                   type: integer
 *                 hidden:
 *                   type: integer
 *                 deleted:
 *                   type: integer
 *             publishedCount:
 *               type: integer
 *             averageRating:
 *               type: number
 *               description: Average of published review ratings (0 when none).
 *             repliedCount:
 *               type: integer
 *             unrepliedCount:
 *               type: integer
 *     AdminReviewDetailResponse:
 *       type: object
 *       properties:
 *         data:
 *           $ref: '#/components/schemas/Review'
 *     AdminReviewStatusResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             reviewId:
 *               type: string
 *               format: uuid
 *             previousStatus:
 *               type: string
 *               enum: [published, hidden, deleted]
 *             status:
 *               type: string
 *               enum: [published, hidden, deleted]
 *     AdminReviewReplyResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             replyId:
 *               type: string
 *               format: uuid
 *             reviewId:
 *               type: string
 *               format: uuid
 *             reply:
 *               type: string
 *     AdminReviewReplyUpdateResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             reviewId:
 *               type: string
 *               format: uuid
 *             reply:
 *               type: string
 *     AdminReviewReplyDeleteResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             reviewId:
 *               type: string
 *               format: uuid
 *             deleted:
 *               type: boolean
 *               example: true
 */

/**
 * @swagger
 * /reviews/hotels/{hotelId}:
 *   get:
 *     summary: List published reviews for a hotel
 *     description: |
 *       Public, paginated list of published reviews for a hotel, newest first.
 *       Authentication is optional: a valid bearer token may enrich the response,
 *       but the endpoint works anonymously.
 *     tags:
 *       - Reviews
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Hotel UUID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 10
 *         description: Only reviews with an overall rating greater than or equal to this value
 *       - in: query
 *         name: maxRating
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 10
 *         description: Only reviews with an overall rating below this value (score band upper bound)
 *       - in: query
 *         name: months
 *         schema:
 *           type: string
 *         description: Comma-separated month numbers (1-12) the review was written in, e.g. "3,4,5"
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Reviewer nationality
 *       - in: query
 *         name: hasMedia
 *         schema:
 *           type: boolean
 *         description: Only reviews with at least one photo
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Keyword matched against the review title and comment
 *     responses:
 *       200:
 *         description: Paginated list of published reviews
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReviewHotelListResponse'
 *       400:
 *         description: Validation error (invalid hotelId or pagination)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /reviews/{reviewId}/vote:
 *   put:
 *     summary: Cast or change a helpful vote on a review
 *     description: |
 *       Records the authenticated user's helpful/not-helpful vote on a review.
 *       One vote per user per review: an existing vote is updated in place.
 *       Users cannot vote on their own review.
 *     tags:
 *       - Reviews
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Review UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isHelpful]
 *             properties:
 *               isHelpful:
 *                 type: boolean
 *                 description: true = helpful, false = not helpful
 *     responses:
 *       200:
 *         description: The vote was recorded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReviewVoteResponse'
 *       400:
 *         description: Validation error or attempting to vote on your own review
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Review not found or not published
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     summary: Remove your helpful vote from a review
 *     description: Idempotent — removing a vote you did not cast is a no-op.
 *     tags:
 *       - Reviews
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Review UUID
 *     responses:
 *       200:
 *         description: The vote was removed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReviewVoteResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Review not found or not published
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /reviews:
 *   get:
 *     summary: List reviews authored by the current user
 *     description: Returns the authenticated user's own reviews across all statuses (including hidden/deleted).
 *     tags:
 *       - Reviews
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Paginated list of the user's reviews
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReviewUserListResponse'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /reviews/validate:
 *   get:
 *     summary: Validate review eligibility for a completed booking
 *     description: |
 *       Checks that the authenticated user has a completed booking matching
 *       `bookingCode` and `hotelId`, i.e. that they are allowed to review it.
 *     tags:
 *       - Reviews
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: bookingCode
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *         description: Booking code of the completed booking
 *       - in: query
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Hotel UUID the booking belongs to
 *     responses:
 *       200:
 *         description: Eligibility result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReviewValidateResponse'
 *       400:
 *         description: Validation error, or missing bookingCode/hotelId
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *       404:
 *         description: Booking not found or not eligible for review
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /reviews/check:
 *   get:
 *     summary: Check whether a completed booking has already been reviewed
 *     description: |
 *       Looks up the authenticated user's completed booking by `bookingCode` and
 *       `hotelId` and reports whether a review already exists for it. Unlike
 *       `/reviews/validate`, a missing/ineligible booking is reported as
 *       `exists: false` rather than a 404.
 *     tags:
 *       - Reviews
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: bookingCode
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *         description: Booking code of the completed booking
 *       - in: query
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Hotel UUID the booking belongs to
 *     responses:
 *       200:
 *         description: Whether a review already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReviewCheckResponse'
 *       400:
 *         description: Validation error (invalid bookingCode/hotelId)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /reviews:
 *   post:
 *     summary: Create a review for a completed booking
 *     description: |
 *       Creates a review for a completed booking. Post-moderation policy: the
 *       review is published immediately and linked to the booking as verified.
 *       Each booking can be reviewed only once.
 *     tags:
 *       - Reviews
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - hotelId
 *               - bookingCode
 *               - ratings
 *               - comment
 *             properties:
 *               hotelId:
 *                 type: string
 *                 format: uuid
 *                 description: Hotel UUID
 *               bookingCode:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: Booking code of the completed booking
 *               ratings:
 *                 type: object
 *                 required:
 *                   - overall
 *                 properties:
 *                   overall:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 10
 *                     description: Overall rating (1-10)
 *                   cleanliness:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 10
 *                   location:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 10
 *                   service:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 10
 *                   value:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 10
 *               title:
 *                 type: string
 *                 maxLength: 150
 *                 nullable: true
 *                 description: Optional review title
 *               comment:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 5000
 *                 description: Review body
 *     responses:
 *       201:
 *         description: Review created and published
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReviewCreateResponse'
 *       400:
 *         description: Validation error, missing fields, or rating out of range
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *       404:
 *         description: Booking not found or not eligible for review
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: This booking has already been reviewed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /admin/reviews:
 *   get:
 *     summary: List reviews for moderation
 *     description: |
 *       Moderation queue with filters for status, hotel, rating range, reply
 *       presence and free-text search, newest first.
 *
 *       Requires the `review.read` permission and hotel context. Hotel context is
 *       resolved from the `x-hotel-id` header, path, body or query `hotelId`
 *       (platform admins may omit it for a global queue).
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-hotel-id
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Hotel context; required unless the caller is platform staff.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [published, hidden, deleted]
 *         description: Filter by review status
 *       - in: query
 *         name: hotelId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by hotel UUID
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 10
 *         description: Minimum overall rating (inclusive)
 *       - in: query
 *         name: maxRating
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 10
 *         description: Maximum overall rating (inclusive)
 *       - in: query
 *         name: hasReply
 *         schema:
 *           type: boolean
 *         description: Filter reviews that have (true) or lack (false) a hotel reply
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *           maxLength: 200
 *         description: Free-text search over title and comment
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Paginated moderation list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminReviewListResponse'
 *       400:
 *         description: Validation error or missing hotel context
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *       403:
 *         description: Missing the `review.read` permission or no access to the hotel
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /admin/reviews/summary:
 *   get:
 *     summary: Get moderation statistics for a hotel
 *     description: |
 *       Returns review counts by status, the average published rating and reply
 *       coverage for one hotel.
 *
 *       Requires the `review.read` permission and hotel context.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Hotel UUID to summarize
 *     responses:
 *       200:
 *         description: Moderation summary for the hotel
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminReviewSummaryResponse'
 *       400:
 *         description: Validation error or missing hotel context
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *       403:
 *         description: Missing the `review.read` permission or no access to the hotel
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /admin/reviews/{reviewId}:
 *   get:
 *     summary: Get a review by ID for moderation
 *     description: |
 *       Returns the full review row plus its author, hotel, reply and media.
 *
 *       Requires the `review.read` permission and hotel context (via the
 *       `x-hotel-id` header or a `hotelId` query/body field).
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Review UUID
 *       - in: header
 *         name: x-hotel-id
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Hotel context; required unless the caller is platform staff.
 *     responses:
 *       200:
 *         description: Review detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminReviewDetailResponse'
 *       400:
 *         description: Validation error or missing hotel context
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *       403:
 *         description: Missing the `review.read` permission or no access to the hotel
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *       404:
 *         description: Review not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /admin/reviews/{reviewId}/status:
 *   patch:
 *     summary: Change a review's moderation status
 *     description: |
 *       Publishes, hides or soft-deletes a review. Only valid state transitions
 *       are allowed: published -> hidden|deleted, hidden -> published|deleted.
 *       `deleted` is terminal.
 *
 *       Requires the `review.moderate` permission and hotel context.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Review UUID
 *       - in: header
 *         name: x-hotel-id
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Hotel context; required unless the caller is platform staff.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [published, hidden, deleted]
 *                 description: New review status
 *               reason:
 *                 type: string
 *                 maxLength: 1000
 *                 nullable: true
 *                 description: Optional moderation reason (recorded in the audit log)
 *     responses:
 *       200:
 *         description: Status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminReviewStatusResponse'
 *       400:
 *         description: Validation error or missing hotel context
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *       403:
 *         description: Missing the `review.moderate` permission or no access to the hotel
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *       404:
 *         description: Review not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Invalid status transition
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /admin/reviews/{reviewId}/reply:
 *   post:
 *     summary: Reply to a review
 *     description: |
 *       Creates the hotel owner/manager reply for a review. Each review may have
 *       at most one reply.
 *
 *       Requires the `review.reply` permission and hotel context.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Review UUID
 *       - in: header
 *         name: x-hotel-id
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Hotel context; required unless the caller is platform staff.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reply
 *             properties:
 *               reply:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 2000
 *                 description: Reply text
 *     responses:
 *       201:
 *         description: Reply created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminReviewReplyResponse'
 *       400:
 *         description: Validation error, empty reply, or missing hotel context
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *       403:
 *         description: Missing the `review.reply` permission or no access to the hotel
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *       404:
 *         description: Review not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: This review already has a reply
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /admin/reviews/{reviewId}/reply:
 *   patch:
 *     summary: Update a review reply
 *     description: |
 *       Replaces the text of an existing hotel reply.
 *
 *       Requires the `review.reply` permission and hotel context.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Review UUID
 *       - in: header
 *         name: x-hotel-id
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Hotel context; required unless the caller is platform staff.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reply
 *             properties:
 *               reply:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 2000
 *                 description: New reply text
 *     responses:
 *       200:
 *         description: Reply updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminReviewReplyUpdateResponse'
 *       400:
 *         description: Validation error, empty reply, or missing hotel context
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *       403:
 *         description: Missing the `review.reply` permission or no access to the hotel
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *       404:
 *         description: Review not found, or the review has no reply to update
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /admin/reviews/{reviewId}/reply:
 *   delete:
 *     summary: Delete a review reply
 *     description: |
 *       Removes the hotel reply from a review.
 *
 *       Requires the `review.reply` permission and hotel context.
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Review UUID
 *       - in: header
 *         name: x-hotel-id
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Hotel context; required unless the caller is platform staff.
 *     responses:
 *       200:
 *         description: Reply deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminReviewReplyDeleteResponse'
 *       400:
 *         description: Validation error or missing hotel context
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *       403:
 *         description: Missing the `review.reply` permission or no access to the hotel
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *       404:
 *         description: Review not found, or the review has no reply to delete
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
