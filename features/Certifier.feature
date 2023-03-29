@certifier
Feature: Certifier

	Scenario: Get available certifiers with invalid access token
      Given I set /certifiers service api endpoint
        And I set invalid access token
       When I send a GET HTTP request 
       Then I receive an unauthorized HTTP Response Code of "401"
        And I receive an error message indicating the problem

    Scenario: Get available certifiers with valid access token
      Given I set /certifiers service api endpoint
       When I send a GET HTTP request
	   Then I receive a valid HTTP Response Code of "200"
	   	And I get a list of all certifiers

	Scenario: Add a valid certifier
      Given I set /certifiers service api endpoint
	    And I set the certifier info
       When I send a POST HTTP request
       Then I receive a valid HTTP Response Code of "200"
	   	And I receive the created certifier
	
	Scenario: Get certifier with valid id
      Given I set /certifiers/:id service api endpoint
	    And I set a valid certifier id
       When I send a GET HTTP request
	   Then I receive a valid HTTP Response Code of "200"
	   	And I get a certifier with same id

	Scenario: Update a valid certifier
      Given I set /certifiers/:id service api endpoint
	    And I have an specific certifier
		And I set a new certifier name
       When I send a PUT HTTP request
       Then I receive a valid HTTP Response Code of "200"
	   	And I receive the updated certifier

	Scenario: Delete a valid certifier
      Given I set /certifiers/:id service api endpoint
	    And I have an specific certifier
       When I send a DELETE HTTP request
       Then I receive a valid HTTP Response Code of "200"
	   	And I receive the deleted certifier id
