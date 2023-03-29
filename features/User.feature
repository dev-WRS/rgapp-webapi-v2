@role
Feature: User

	Scenario: Get available actions with invalid access token
      Given I set /user/actions service api endpoint
        And I set invalid access token
       When I send a GET HTTP request 
       Then I receive an unauthorized HTTP Response Code of "401"
        And I receive an error message indicating the problem

	Scenario: Get available actions with valid access token
      Given I set /user/actions service api endpoint
       When I send a GET HTTP request
	   Then I receive a valid HTTP Response Code of "200"
	   	And I get a list of user actions

	Scenario: Get available users with invalid access token
      Given I set /users service api endpoint
        And I set invalid access token
       When I send a GET HTTP request 
       Then I receive an unauthorized HTTP Response Code of "401"
        And I receive an error message indicating the problem
		   
    Scenario: Get available users with valid access token
      Given I set /users service api endpoint
       When I send a GET HTTP request
	   Then I receive a valid HTTP Response Code of "200"
	   	And I get a list of all users

	Scenario: Add a valid user
      Given I set /users service api endpoint
	    And I set the user info
       When I send a POST HTTP request
       Then I receive a valid HTTP Response Code of "200"
	   	And I receive the created user
	
	Scenario: Get user with valid id
      Given I set /users/:id service api endpoint
	    And I set a valid user id
       When I send a GET HTTP request
	   Then I receive a valid HTTP Response Code of "200"
	   	And I get a user with same id

	Scenario: Update a valid user
      Given I set /users/:id service api endpoint
	    And I have an specific user
		And I set a new user name
       When I send a PUT HTTP request
       Then I receive a valid HTTP Response Code of "200"
	   	And I receive the updated user

	Scenario: Activate a valid user
      Given I set /users/:id/activate service api endpoint
	    And I have an specific user
       When I send a PUT HTTP request
       Then I receive a valid HTTP Response Code of "200"
	   	And I receive the activated user

	Scenario: Deactivate a valid user
      Given I set /users/:id/deactivate service api endpoint
	    And I have an specific user
       When I send a PUT HTTP request
       Then I receive a valid HTTP Response Code of "200"
	   	And I receive the deactivated user

	Scenario: Delete a valid user
      Given I set /users/:id service api endpoint
	    And I have an specific user
       When I send a DELETE HTTP request
       Then I receive a valid HTTP Response Code of "200"
	   	And I receive the deleted user id
