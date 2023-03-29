@action
Feature: Action

	Scenario: Get available actions with invalid access token
      Given I set /actions service api endpoint
        And I set invalid access token
       When I send a GET HTTP request 
       Then I receive an unauthorized HTTP Response Code of "401"
        And I receive an error message indicating the problem

	 Scenario: Get available actions
      Given I set /actions service api endpoint
       When I send a GET HTTP request
	   Then I receive a valid HTTP Response Code of "200"
	   	And I get a list of actions