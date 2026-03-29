"""
This is a flask application with the following directory structure:
flask-app/
  app.py
  questionnaire_generator.py
  questionnaires/
    questionnaire1.json
    questionnaire1.docx
  templates/
    project_details.html
    research_objectives.html
    questionnaire.html
  css/
    style.css
  js/
    script.js
"""

from flask import Flask, render_template, request
from waitress import serve
from survey_generator import SurveyGenerator

app = Flask(__name__)

@app.route('/')
def index():
    """
    This is the first page of the wizard that asks for project details.
    This page has a form that posts to the next page (business overview)
    """
    return render_template('project_details.html')

@app.route('/business_overview', methods=['POST'])
def business_overview():
    """
    This is the second page of the wizard that asks for business overview.
    This receives the form data from the previous page and executes functions
    from Survey Generator
    """
    project_name = request.form['project_name']
    company_name = request.form['company_name']
    industry = request.form['industry']
    use_case = request.form['use_case']
    business_overview_ = questionnaire_generator.get_business_overview(company_name)
    return render_template('business_overview.html',
                           project_name=project_name,
                           company_name=company_name,
                           business_overview=business_overview_,
                           industry=industry, use_case=use_case)

@app.route('/research_objectives', methods=['POST'])
def research_objectives():
    """
    This is the second page of the wizard that asks for research objectives.
    This receives the form data from the previous page and executes functions
    from Survey Generator
    """
    project_name = request.form['project_name']
    company_name = request.form['company_name']
    business_overview_ = request.form['business_overview']
    industry = request.form['industry']
    use_case = request.form['use_case']
    # research_objectives = "The purpose of this research project is to <PURPOSE AND USE CASE>. Through this study, <COMPANY NAME> aims to understand <KEY QUESTIONS>. The results of the research project should help <COMPANY NAME> <IMPACT OF THE RESEARCH>."
    # research_obj = research_obj.replace("<brand>", company_name)
    research_obj = questionnaire_generator.get_research_objectives(company_name,
                                                                   business_overview_,
                                                                   industry,
                                                                   use_case)
    return render_template('research_objectives.html', project_name=project_name,
                           company_name=company_name, business_overview=business_overview_,
                           research_objectives=research_obj,
                           industry=industry, use_case=use_case)

@app.route('/questionnaire', methods=['POST'])
def questionnaire():
    """
    This is the third page of the wizard that takes the business overview and
    research objectives from the form in the previous page and generates a questionnaire.
    This receives the form data from the previous page and
    executes functions from Survey Generator
    """
    research_obj = request.form['research_objectives']
    business_overview_ = request.form['business_overview']
    project_name = request.form['project_name']
    company_name = request.form['company_name']
    industry = request.form['industry']
    use_case = request.form['use_case']
    #request_id = 0
    questionnare_, _ = questionnaire_generator.create_survey(company_name,
                                                          business_overview_,
                                                          research_obj, project_name)
    doc_link = questionnaire_generator.export_docx(project_name, company_name, research_obj, questionnare_)
    embed_link = doc_link + '&hl=en&embedded=true'
    return render_template('questionnaire.html', company_name=company_name,
                           questionnaire=questionnare_, doc_link=doc_link,
                           project_name=project_name,
                           embed_link = embed_link)


if __name__ == '__main__':
    questionnaire_generator = SurveyGenerator()
    # serve(app) 
    app.run()
    