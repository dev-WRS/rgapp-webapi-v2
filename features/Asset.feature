@asset
Feature: Asset

	Scenario: Get available assets with invalid access token
      Given I set /assets service api endpoint
        And I set invalid access token
       When I send a GET HTTP request 
       Then I receive an unauthorized HTTP Response Code of "401"
        And I receive an error message indicating the problem

    Scenario: Get available assets with valid access token
      Given I set /assets service api endpoint
       When I send a GET HTTP request
	   Then I receive a valid HTTP Response Code of "200"
	   	And I get a list of all assets

	Scenario: Add a valid asset
      Given I set /assets service api endpoint
	    And I set the asset info
       When I send a POST HTTP request
       Then I receive a valid HTTP Response Code of "200"
	   	And I receive the created asset
	
	Scenario: Get asset with valid id
      Given I set /assets/:id service api endpoint
	    And I set a valid asset id
       When I send a GET HTTP request
	   Then I receive a valid HTTP Response Code of "200"
	   	And I get a asset with same id

	Scenario: Delete valid asset(s)
      Given I set /assets service api endpoint
	    And I have specific asset(s)
       When I send a DELETE HTTP request
       Then I receive a valid HTTP Response Code of "200"
	   	And I receive the deleted asset id(s)

	Scenario: Delete restricted asset(s)
      Given I set /assets service api endpoint
	    And I have specific asset(s)
       When I send a DELETE HTTP request
       Then I receive a valid HTTP Response Code of "200"
	   	And I receive the warning message(s)

	Scenario: Delete valid and restricted asset(s)
      Given I set /assets service api endpoint
	    And I have valid and restricted asset(s)
       When I send a DELETE HTTP request
       Then I receive a valid HTTP Response Code of "200"
	   	And I receive the warning message(s) and asset id(s)
