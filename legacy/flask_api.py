from flask import Flask, request, jsonify
from flask_restful import Resource, Api
from flask_cors import CORS

from survey_generator import SurveyGenerator
import os
import sqlite3
import json
from subprocess import Popen
import logging

app = Flask('SurveyGeneratorAPI')
CORS(app)
api = Api(app)

class BusinessOverviewAPI(Resource):
    """Business Overview API Resource class."""
    def post(self):
        """Post request through flask API and return response with business overview."""
        try:
            json_object = request.get_json()
            business_overview = survey_gen_obj.get_business_overview(json_object['company_name'])
            response = {
                "success": 1,                                                                                       
                "request_id": json_object["request_id"],
                "project_name": json_object["project_name"],
                "company_name": json_object["company_name"],
                "business_overview": business_overview,
                "industry": json_object["industry"],
                "use_case": json_object["use_case"],
            }
            response = jsonify(response)
            response.status_code = 201
        except Exception as error:
            # Trace the last line of error and return it in message for easier debugging
            trace = []
            tb = error.__traceback__
            while tb is not None:
                trace.append({
                    "filename": tb.tb_frame.f_code.co_filename,
                    "name": tb.tb_frame.f_code.co_name,
                    "lineno": tb.tb_lineno
                })
                tb = tb.tb_next
            response = jsonify({"success": 0,
                                "request_id": json_object["request_id"],
                                "project_name": json_object["project_name"],
                                "company_name": json_object["company_name"],
                                "industry": json_object["industry"],
                                "use_case": json_object["use_case"],
                                "message": f"{error} on {trace[-1]['lineno']}"
                                           f" in {trace[-1]['name']}"})
            response.status_code = 400
        return response

class Business_ResearchObjAPI(Resource):
    """Business Overview API Resource class."""
    def post(self):
        """Post request through flask API and return response with business overview."""
        try:
            json_object = request.get_json()
            business_overview = survey_gen_obj.get_business_overview(json_object['company_name'])
            research_obj = survey_gen_obj.get_research_objectives(json_object['company_name'],
                                                                  business_overview,
                                                                  json_object['industry'],
                                                                  json_object['use_case'])
            response = {
                "success": 1,
                "request_id": json_object["request_id"],
                "project_name": json_object["project_name"],
                "company_name": json_object["company_name"],
                "business_overview": business_overview,
                "research_obj":research_obj,
                "industry": json_object["industry"],
                "use_case": json_object["use_case"],
            }
            response = jsonify(response)
            response.status_code = 201
        except Exception as error:
            # Trace the last line of error and return it in message for easier debugging
            trace = []
            tb = error.__traceback__
            while tb is not None:
                trace.append({
                    "filename": tb.tb_frame.f_code.co_filename,
                    "name": tb.tb_frame.f_code.co_name,
                    "lineno": tb.tb_lineno
                })
                tb = tb.tb_next
            response = jsonify({"success": 0,
                                "request_id": json_object["request_id"],
                                "project_name": json_object["project_name"],
                                "company_name": json_object["company_name"],
                                "industry": json_object["industry"],
                                "use_case": json_object["use_case"],
                                "message": f"{error} on {trace[-1]['lineno']}"
                                           f" in {trace[-1]['name']}"})
            response.status_code = 400
        return response

class ResearchObjectivesAPI(Resource):
    """Research Objectives API Resource class."""
    def post(self):
        """Post request through flask API and return response with research objectives."""
        try:
            json_object = request.get_json()
            research_obj = survey_gen_obj.get_research_objectives(json_object['company_name'],
                                                                json_object['business_overview'],
                                                                json_object['industry'],
                                                                json_object['use_case'])
            response = {
                "success": 1,
                "request_id": json_object["request_id"],
                "project_name": json_object["project_name"],
                "company_name": json_object["company_name"],
                "business_overview": json_object["business_overview"],
                "research objectives": research_obj,
                "industry": json_object["industry"],
                "use_case": json_object["use_case"],
            }
            response = jsonify(response)
            response.status_code = 201
        except Exception as error:
            # Trace the last line of error and return it in message for easier debugging
            trace = []
            tb = error.__traceback__
            while tb is not None:
                trace.append({
                    "filename": tb.tb_frame.f_code.co_filename,
                    "name": tb.tb_frame.f_code.co_name,
                    "lineno": tb.tb_lineno
                })
                tb = tb.tb_next
            response = jsonify({"success": 0,
                                "request_id": json_object["request_id"],
                                "project_name": json_object["project_name"],
                                "company_name": json_object["company_name"],
                                "business_overview": json_object["business_overview"],
                                "industry": json_object["industry"],
                                "use_case": json_object["use_case"],
                                "message": f"{error} on {trace[-1]['lineno']}"
                                            f" in {trace[-1]['name']}"})
            response.status_code = 400
        return response

class SurveyGeneratorAPI(Resource):
    """Survey Generator API Resource class."""
    def post(self):
        """Post request through flask API and return response with questionnaire and google doc link."""
        
        json_object = request.get_json()
        project_name= json_object["project_name"]
        request_id =  str(json_object["request_id"])

        # Creating connection with sqlite database   
        if os.path.exists('./sdk_sqlite.db'):
            conn = sqlite3.connect('./sdk_sqlite.db')
        else:
            conn = sqlite3.connect('./sdk_sqlite.db')
            table = "create table request_status (request_id TEXT, status INT)"
            conn.execute(table)
        # Searching whether request_id already exists in table
        cursor = conn.cursor()
        sqlite_select_query = 'SELECT * from request_status where request_id==?'
        cursor.execute(sqlite_select_query, (request_id,))
        records = cursor.fetchall()
        conn.close()
        
        # If request_id already exists in table according to the status below loop will get executed
        for i in records:
            if records[0]:
                # If the status is 2, it will give response as in progress because output is not generated yet
                if records[0][1] == 2:
                    response = {
                        "success": 2,
                        "status":"RUNNING",
                        "request_id": json_object["request_id"],
                        "project_name": json_object["project_name"],
                        "company_name": json_object["company_name"],
                        "research_objectives": json_object["research_objectives"],
                        "business_overview": json_object['business_overview'],
                        "industry": json_object["industry"],
                        "use_case": json_object["use_case"],
                        "pages": '',
                        "doc_link": ''
                    }
                # If the status is 1, it means output is generated so it will give that output in response
                elif records[0][1] == 1:
                    if os.path.exists(f'questionnaires/questionnaire_{project_name.replace(" ", "_").replace("/", "-")}_{request_id}.json'):
                        #self.logger.info('Using saved Quesstionaire JSON!!!')
                        with open(f'questionnaires/questionnaire_{project_name.replace(" ", "_").replace("/", "-")}_{request_id}.json') as json_file:
                            questionnaire = json.load(json_file)
                            surveyjs_questionnaire = survey_gen_obj.surveyjs_questionnaire(questionnaire)
                        doc_link = survey_gen_obj.export_docx(json_object['project_name'],
                                                    json_object['company_name'],
                                                    json_object['research_objectives'],
                                                    questionnaire,
                                                    json_object["request_id"]
                                                    )    
                        response = {
                                        "success": 1,
                                        "status":'COMPLETED',
                                        "request_id": json_object["request_id"],
                                        "project_name": json_object["project_name"],
                                        "company_name": json_object["company_name"],
                                        "research_objectives": json_object["research_objectives"],
                                        "business_overview": json_object['business_overview'],
                                        "industry": json_object["industry"],
                                        "use_case": json_object["use_case"],
                                        "pages": surveyjs_questionnaire,
                                        "doc_link": doc_link
                                    }
                    else:
                        request_id = json_object["request_id"]
                        conn = sqlite3.connect('sdk_sqlite.db')
                        cursor = conn.cursor()
                        ins = 'UPDATE request_status SET status=2 WHERE request_id=?'
                        cursor.execute(ins, (request_id,))
                        # conn.execute(ins)
                        conn.commit()
                        conn.close()
                        response = {
                                        "success": 2,
                                        "status": "RUNNING",
                                        "request_id": json_object["request_id"],
                                        "project_name": json_object["project_name"],
                                        "company_name": json_object["company_name"],
                                        "research_objectives": json_object["research_objectives"],
                                        "business_overview": json_object['business_overview'],
                                        "industry": json_object["industry"],
                                        "use_case": json_object["use_case"],
                                        "pages": '',
                                        "doc_link": ''
                                    }
                        x4 = Popen(['python', "questionaire.py", '--json_object', json.dumps(json_object)], close_fds=True)
                # If the status is 0, it means error had ocured in previous execution it wil execute it again
                elif records[0][1] == 0: 
                    request_id = json_object["request_id"]
                    conn = sqlite3.connect('sdk_sqlite.db')
                    cursor = conn.cursor()
                    ins = 'UPDATE request_status SET status=2 WHERE request_id=?'
                    cursor.execute(ins, (request_id,))
                    # conn.execute(ins)
                    conn.commit()
                    conn.close()
                    response = {
                        "success": 2,
                        "status": "RUNNING",
                        "request_id": json_object["request_id"],
                        "project_name": json_object["project_name"],
                        "company_name": json_object["company_name"],
                        "research_objectives": json_object["research_objectives"],
                        "business_overview": json_object['business_overview'],
                        "industry": json_object["industry"],
                        "use_case": json_object["use_case"],
                        "pages": '',
                        "doc_link": ''
                        }
                    # Executing the process another thread 
                    x1 = Popen(['python', "questionaire.py", '--json_object', json.dumps(json_object)], close_fds=True)
            break    
        # If request_id is not present in table new entry is added and execution will run on another thread            
        else:
            conn = sqlite3.connect('./sdk_sqlite.db')
            ins = """INSERT INTO request_status (request_id, status) VALUES (?, ?);"""
            conn.execute(ins, (request_id, 2))
            conn.commit()
            conn.close()
            response = {
                "success": 2,
                "status":'STARTED',
                "request_id": json_object["request_id"],
                "project_name": json_object["project_name"],
                "company_name": json_object["company_name"],
                "research_objectives": json_object["research_objectives"],
                "business_overview": json_object['business_overview'],
                "industry": json_object["industry"],
                "use_case": json_object["use_case"],
                "pages": '',
                "doc_link": ''
                }
            # Executing the process another thread 
            x2 = Popen(['python', "questionaire.py", '--json_object', json.dumps(json_object)], close_fds=True)
            
                
        return response

# Create endpoint
api.add_resource(BusinessOverviewAPI, '/BusinessOverview')
api.add_resource(ResearchObjectivesAPI, '/ResearchObjectives')
api.add_resource(Business_ResearchObjAPI, '/Business_ResearchObjAPI')
api.add_resource(SurveyGeneratorAPI, '/Questionnaire')

if __name__ == '__main__':
    survey_gen_obj = SurveyGenerator()
    app.run(debug=True, host='0.0.0.0', port=8080, threaded=True)
    