@forgot-password
Feature: User Forgot Password

    Scenario: Post forgot password route with empty params
      Given I set /send-code service api endpoint
        And I set empty params on request body
       When I send a POST HTTP request 
       Then I receive an bad request HTTP Response Code of "400"
        And I receive an error message indicating the problem

    Scenario: Post forgot password route with invalid params
      Given I set /send-code service api endpoint
        And I set invalid params on request body 
       When I send a POST HTTP request 
       Then I receive an bad request HTTP Response Code of "400"
        And I receive an error message indicating the problem   

    Scenario: Post forgot password route with wrong value(s)
      Given I set /send-code service api endpoint
        And I set wrong value(s) on request body  
       When I send a POST HTTP request 
       Then I receive an bad request HTTP Response Code of "400"
        And I receive an error message indicating the problem

    Scenario: Post forgot password route with unexistent email
      Given I set /send-code service api endpoint
        And I set unexisting email as part of the request body 
       When I send a POST HTTP request 
       Then I receive a valid HTTP Response Code of "200"
        And I receive a success message

	Scenario: Post forgot password route with existing but unverified email
      Given I set /send-code service api endpoint
        And I set existing but unverified email as part of the request body
       When I send a POST HTTP request 
       Then I receive a valid HTTP Response Code of "200"
	   	And I receive a success message	

    Scenario: Post forgot password route with existing and verified email
      Given I set /send-code service api endpoint
        And I set existing and verified email as part of the request body
       When I send a POST HTTP request 
       Then I receive a valid HTTP Response Code of "200"
	   	And I receive a success message