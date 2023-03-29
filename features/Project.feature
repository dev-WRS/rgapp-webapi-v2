@project
Feature: Project

	Scenario: Get available projects with invalid access token
      Given I set /projects service api endpoint
        And I set invalid access token
       When I send a GET HTTP request 
       Then I receive an unauthorized HTTP Response Code of "401"
        And I receive an error message indicating the problem

    Scenario: Get available projects with valid access token
      Given I set /projects service api endpoint
       When I send a GET HTTP request
	   Then I receive a valid HTTP Response Code of "200"
	   	And I get a list of all projects

	Scenario: Add a valid 45L project
      Given I set /projects service api endpoint
	    And I set the project info
       When I send a POST HTTP request
       Then I receive a valid HTTP Response Code of "200"
	   	And I receive the created project

	Scenario: Add a valid 179D project
      Given I set /projects service api endpoint
	    And I set the project info
       When I send a POST HTTP request
       Then I receive a valid HTTP Response Code of "200"
	   	And I receive the created project
	
	Scenario: Get project with valid id
      Given I set /projects/:id service api endpoint
	    And I set a valid project id
       When I send a GET HTTP request
	   Then I receive a valid HTTP Response Code of "200"
	   	And I get a project with same id

@unfinished
	Scenario: Update a valid project
      Given I set /projects/:id service api endpoint
	    And I have an specific project
		And I set a new project name
       When I send a PUT HTTP request
       Then I receive a valid HTTP Response Code of "200"
	   	And I receive the updated project

@unfinished
	Scenario: Delete a valid project
      Given I set /projects/:id service api endpoint
	    And I have an specific project
       When I send a DELETE HTTP request
       Then I receive a valid HTTP Response Code of "200"
	   	And I receive the deleted project id
