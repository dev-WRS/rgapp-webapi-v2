@login
Feature: User Login

    Scenario: Post login route with empty params
      Given I set /login service api endpoint
        And I set empty params on request body
       When I send a POST HTTP request 
       Then I receive an bad request HTTP Response Code of "400"
        And I receive an error message indicating the problem

    Scenario: Post login route with invalid params
      Given I set /login service api endpoint
        And I set invalid params on request body 
       When I send a POST HTTP request 
       Then I receive an bad request HTTP Response Code of "400"
        And I receive an error message indicating the problem

	Scenario: Post login route with invalid email format
      Given I set /login service api endpoint
        And I set invalid email format on request body 
       When I send a POST HTTP request 
       Then I receive an bad request HTTP Response Code of "400"
        And I receive an error message indicating the problem

	  Scenario Outline: Post login route with wrong <case>
		Given I set /login service api endpoint
		  And I set credentials value(s) on request body <email> & <password>
		  And I set user email verified as <emailVerified>
		 When I send a POST HTTP request 
		 Then I receive an unauthorized HTTP Response Code of "401"
          And I receive an error message indicating the problem
	
		 Examples:
		   	|	case			|	email			|	password	|	emailVerified	|
		   	|	email			|	bad@email.com	|	sup3rS3cr3t	|	false			|
		   	|	password		|	login@email.com	|   b@dp@ssword	|   true			|

    Scenario: Post login route with valid credentials
      Given I set /login service api endpoint
        And I set valid credentials on request body
       When I send a POST HTTP request 
       Then I receive a valid HTTP Response Code of "200"
	   	And I receive the user data