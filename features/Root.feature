Feature: Root route

	Background
		Given an accesible REST Web API

	Scenario: Get root route without api key
		When a client performs a get method to root route
		Then it should receive a "401" status code response

	Scenario: Get root route with invalid api key
		Given a invalid api key
		When a client performs a get method to root route
		Then it should receive a "401" status code response

	Scenario: Get root route with valid api key
		Given a valid api key
		When a client performs a get method to root route
		Then it should receive a "200" status code response

	Scenario: Get jwt route without access token
		When a client performs a get method to root route
		Then it should receive a "401" status code response

	Scenario: Get jwt route with invalid access token
		Given a invalid access token
		When a client performs a get method to root route
		Then it should receive a "401" status code response

	Scenario: Get jwt route with valid access token
		Given a valid access token
		When a client performs a get method to root route
		Then it should receive a "200" status code response