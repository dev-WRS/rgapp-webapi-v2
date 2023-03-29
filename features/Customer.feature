@customer
Feature: Customer

	Scenario: Get available customers with invalid access token
      Given I set /customers service api endpoint
        And I set invalid access token
       When I send a GET HTTP request 
       Then I receive an unauthorized HTTP Response Code of "401"
        And I receive an error message indicating the problem

    Scenario: Get available customers with valid access token
      Given I set /customers service api endpoint
       When I send a GET HTTP request
	   Then I receive a valid HTTP Response Code of "200"
	   	And I get a list of all customers

	Scenario: Add a valid customer
      Given I set /customers service api endpoint
	    And I set the customer info
       When I send a POST HTTP request
       Then I receive a valid HTTP Response Code of "200"
	   	And I receive the created customer
	
	Scenario: Get customer with valid id
      Given I set /customers/:id service api endpoint
	    And I set a valid customer id
       When I send a GET HTTP request
	   Then I receive a valid HTTP Response Code of "200"
	   	And I get a customer with same id

	Scenario: Update a valid customer
      Given I set /customers/:id service api endpoint
	    And I have an specific customer
		And I set a new customer name
       When I send a PUT HTTP request
       Then I receive a valid HTTP Response Code of "200"
	   	And I receive the updated customer

	Scenario: Delete a valid customer
      Given I set /customers/:id service api endpoint
	    And I have an specific customer
       When I send a DELETE HTTP request
       Then I receive a valid HTTP Response Code of "200"
	   	And I receive the deleted customer id
