@reset-password
Feature: User Reset Password

	Scenario: Post reset password route with invalid access token
      Given I set /reset-password service api endpoint
        And I set invalid access token
       When I send a POST HTTP request 
       Then I receive an unauthorized HTTP Response Code of "401"
        And I receive an error message indicating the problem

    Scenario: Post reset password route with empty params
      Given I set /reset-password service api endpoint
        And I set empty params on request body
       When I send a POST HTTP request 
       Then I receive an bad request HTTP Response Code of "400"
        And I receive an error message indicating the problem

    Scenario: Post reset password route with invalid params
      Given I set /reset-password service api endpoint
        And I set invalid params on request body 
       When I send a POST HTTP request 
       Then I receive an bad request HTTP Response Code of "400"
        And I receive an error message indicating the problem   

	Scenario: Post reset password route with invalid email format
      Given I set /reset-password service api endpoint
        And I set invalid email format on request body  
       When I send a POST HTTP request 
       Then I receive an bad request HTTP Response Code of "400"
        And I receive an error message indicating the problem

    Scenario: Post reset password route with wrong user email
      Given I set /reset-password service api endpoint
        And I set wrong user email on request body  
       When I send a POST HTTP request 
       Then I receive an unauthorized HTTP Response Code of "401"
        And I receive an error message indicating the problem

    Scenario: Post reset password route with valid value(s)
      Given I set /reset-password service api endpoint
        And I set valid value(s) on request body
       When I send a POST HTTP request
	   Then I receive a valid HTTP Response Code of "200"
	   	And I get updated values from the user