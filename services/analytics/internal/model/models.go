package model

import "time"

type SearchLog struct {
	SearchID        string     `bson:"searchId"`
	UserID          *string    `bson:"userId"`
	DestinationID   *string    `bson:"destinationId"`
	DestinationType string     `bson:"destinationType"`
	SearchTime      time.Time  `bson:"searchTime"`
	Adults          int        `bson:"adults"`
	Children        int        `bson:"children"`
	Rooms           int        `bson:"rooms"`
	CheckInDate     *time.Time `bson:"checkInDate"`
	CheckOutDate    *time.Time `bson:"checkOutDate"`
	Nights          int        `bson:"nights"`
	IsDeleted       bool       `bson:"isDeleted"`
	CreatedAt       time.Time  `bson:"createdAt"`
	UpdatedAt       time.Time  `bson:"updatedAt"`
}

type HotelViewEvent struct {
	EventID   string    `bson:"eventId"`
	HotelID   string    `bson:"hotelId"`
	UserID    *string   `bson:"userId"`
	SessionID string    `bson:"sessionId"`
	ViewedAt  time.Time `bson:"viewedAt"`
	IPAddress string    `bson:"ipAddress"`
	UserAgent string    `bson:"userAgent"`
	CreatedAt time.Time `bson:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt"`
}

type TrendingHotel struct {
	HotelID string `json:"hotelId" bson:"hotelId"`
	Views   int    `json:"views" bson:"views"`
}

type TrendingDestination struct {
	DestinationID   string `json:"destinationId" bson:"destinationId"`
	DestinationType string `json:"destinationType" bson:"destinationType"`
	SearchCount     int    `json:"searchCount" bson:"searchCount"`
	UniqueUsers     int    `json:"uniqueUsers" bson:"uniqueUsers"`
}

type SearchDemand struct {
	CheckInDate     string  `json:"checkInDate" bson:"checkInDate"`
	DestinationID   string  `json:"destinationId" bson:"destinationId"`
	DestinationType string  `json:"destinationType" bson:"destinationType"`
	SearchCount     int     `json:"searchCount" bson:"searchCount"`
	AvgNights       float64 `json:"avgNights" bson:"avgNights"`
	AvgGuests       float64 `json:"avgGuests" bson:"avgGuests"`
}

type UserSearchSummary struct {
	UserID           string    `json:"userId" bson:"userId"`
	TotalSearches    int       `json:"totalSearches" bson:"totalSearches"`
	LocationsVisited []string  `json:"locationsVisited" bson:"locationsVisited"`
	LastSearchTime   time.Time `json:"lastSearchTime" bson:"lastSearchTime"`
	FirstSearchTime  time.Time `json:"firstSearchTime" bson:"firstSearchTime"`
	UniqueLocations  int       `json:"uniqueLocations" bson:"uniqueLocations"`
}

type UserSearch struct {
	SearchID     string     `json:"searchId" bson:"searchId"`
	CheckInDate  *time.Time `json:"checkInDate" bson:"checkInDate"`
	CheckOutDate *time.Time `json:"checkOutDate" bson:"checkOutDate"`
	Adults       int        `json:"adults" bson:"adults"`
	Children     int        `json:"children" bson:"children"`
	Rooms        int        `json:"rooms" bson:"rooms"`
	SearchTime   time.Time  `json:"searchTime" bson:"searchTime"`
}
