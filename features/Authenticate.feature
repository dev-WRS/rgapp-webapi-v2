@authenticate
Feature: Token Auth

    Scenario: Post authenticate route with no access token
      Given I set /authenticate service api endpoint
        And I set no access token
       When I send a POST HTTP request 
       Then I receive an bad request HTTP Response Code of 401
        And I receive an error message indicating the problem

	Scenario: Post authenticate route with wrong token
		Given I set /authenticate service api endpoint
		  And I set invalid access token
		 When I send a POST HTTP request 
		 Then I receive an unauthorized HTTP Response Code of 401
          And I receive an error message indicating the problem

	Scenario: Post authenticate route with valid token
      Given I set /authenticate service api endpoint
        And I set valid access token
       When I send a POST HTTP request 
       Then I receive a valid HTTP Response Code of 200
	   	And I receive the user data