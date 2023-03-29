@email-verify
Feature: User Email Verification

    Scenario: Post email verify route with empty params
      Given I set /email-verify service api endpoint
        And I set empty params on request body
       When I send a POST HTTP request 
       Then I receive an bad request HTTP Response Code of "400"
        And I receive an error message indicating the problem

    Scenario: Post email verify route with invalid params
      Given I set /email-verify service api endpoint
        And I set invalid params on request body 
       When I send a POST HTTP request 
       Then I receive an bad request HTTP Response Code of "400"
        And I receive an error message indicating the problem   

    Scenario: Post email verify route with invalid email format
      Given I set /email-verify service api endpoint
        And I set invalid email format on request body  
       When I send a POST HTTP request 
       Then I receive an bad request HTTP Response Code of "400"
        And I receive an error message indicating the problem

	  Scenario Outline: Post email verify route with wrong <case>
		Given I set /email-verify service api endpoint
		  And I set <email> & <secureCode> on request body
		  And I set secure expiration date based on <isSecureCodeExpired> 
		 When I send a POST HTTP request 
       	 Then I receive an unauthorized HTTP Response Code of "401"
          And I receive an error message indicating the problem
	
		 Examples:
			|	case					|	email			|	secureCode	|	isSecureCodeExpired	|
			|	email					|	bad@email.com	|	123456		|	false				|
		   	|	secure code				|	login@email.com	|   000000		|   false				|
			|	expiration date code	|	login@email.com	|	123456		|	true				|

    Scenario: Post email verify route with valid value(s)
      Given I set /email-verify service api endpoint
	  	And I set a secure code with valid expiration date
        And I set valid value(s) on request body
       When I send a POST HTTP request 
       Then I receive a valid HTTP Response Code of "200"
	    And I receive a verified user email