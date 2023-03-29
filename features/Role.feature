@role
Feature: Role

	Scenario: Get available roles with invalid access token
      Given I set /roles service api endpoint
        And I set invalid access token
       When I send a GET HTTP request 
       Then I receive an unauthorized HTTP Response Code of "401"
        And I receive an error message indicating the problem

    Scenario: Get available roles with valid access token
      Given I set /roles service api endpoint
       When I send a GET HTTP request
	   Then I receive a valid HTTP Response Code of "200"
	   	And I get a list of all roles
	
	Scenario: Get role with valid id
      Given I set /roles service api endpoint
	    And I set a valid role id
       When I send a GET HTTP request
	   Then I receive a valid HTTP Response Code of "200"
	   	And I get a role with same id

	Scenario: Delete actions from valid role
      Given I set /roles service api endpoint
	    And I have an specific role
		And I remove actions from the role
       When I send a PUT HTTP request
       Then I receive a valid HTTP Response Code of "200"
	   	And I get a role with same id
		And I get an empty list of actions

	Scenario: Set actions to a valid role
      Given I set /roles service api endpoint
	    And I have an specific role
		And I set actions to the role
       When I send a PUT HTTP request
       Then I receive a valid HTTP Response Code of "200"
	   	And I get a role with same id
		And I get a list of actions > 0