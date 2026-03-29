import os
import yaml
from pathlib import Path

class PromptTemplates:
    def __init__(self):
        # Industry standard: resolver path relative to the current file
        self.base_path = Path(__file__).resolve().parent.parent.parent / "prompts" / "prompts_chatgpt"
        self._load_prompts()
        
    def _load_prompts(self):
        self.business_overview = self._load_yaml("prompt_business_overview.yml")
        self.research_objective = self._load_yaml("prompt_research_objective.yml")
        self.survey_generator = self._load_yaml("prompt_survey_generator.yml")
        self.matrix_oe = self._load_yaml("prompt_matrix_oe.yml")
        self.video_question = self._load_yaml("prompt_video_question.yml")
        self.choices_matrix = self._load_yaml("prompt_choices_matrix.yml")
        self.choices_mcq = self._load_yaml("prompt_choices_mcq.yml")

    def _load_yaml(self, filename: str):
        path = self.base_path / filename
        with open(path, "r", encoding='utf-8') as f:
            data = yaml.safe_load(f)
        return data["messages"]

    def get_business_overview_prompt(self, company_name: str):
        import copy
        prompt = copy.deepcopy(self.business_overview)
        prompt[1]["content"] = prompt[1]["content"].replace('<<COMPANY NAME>>', company_name)
        return prompt

    def get_research_objectives_prompt(self, company_name: str, business_overview: str, industry: str, use_case: str):
        import copy
        prompt = copy.deepcopy(self.research_objective)
        prompt[1]["content"] = prompt[1]["content"]\
            .replace("<<COMPANY NAME>>", company_name)\
            .replace("<<INDUSTRY>>", industry)\
            .replace("<<USE CASE>>", use_case)\
            .replace("<<BUSINESS OVERVIEW>>", business_overview)
        return prompt

    def get_survey_generator_prompt(self, company_name: str, business_overview: str, research_objectives: str):
        import copy
        prompt = copy.deepcopy(self.survey_generator)
        prompt[0]["content"] = prompt[0]["content"].replace("<<COMPANY NAME>>", company_name)
        prompt[1]["content"] = prompt[1]["content"]\
            .replace("<<BUSINESS OVERVIEW>>", business_overview)\
            .replace("<<RESEARCH OBJECTIVES>>", research_objectives)\
            .replace("<<COMPANY NAME>>", company_name)
        return prompt

    def get_matrix_choices_prompt(self, question: str, company_name: str, business_overview: str, research_objectives: str):
        import copy
        prompt = copy.deepcopy(self.choices_matrix)
        prompt[0]["content"] = prompt[0]["content"].replace("<<COMPANY NAME>>", company_name)
        prompt[1]["content"] = prompt[1]["content"]\
            .replace("<<BUSINESS OVERVIEW>>", business_overview)\
            .replace("<<RESEARCH OBJECTIVES>>", research_objectives)\
            .replace("<<COMPANY NAME>>", company_name)\
            .replace("<<QUESTION>>", question)
        return prompt

    def get_mcq_choices_prompt(self, question: str, company_name: str, business_overview: str, research_objectives: str):
        import copy
        prompt = copy.deepcopy(self.choices_mcq)
        prompt[0]["content"] = prompt[0]["content"].replace("<<COMPANY NAME>>", company_name)
        prompt[1]["content"] = prompt[1]["content"]\
            .replace("<<BUSINESS OVERVIEW>>", business_overview)\
            .replace("<<RESEARCH OBJECTIVES>>", research_objectives)\
            .replace("<<COMPANY NAME>>", company_name)\
            .replace("<<QUESTION>>", question)
        return prompt

    def get_video_question_prompt(self, company_name: str, business_overview: str, research_objectives: str):
        import copy
        prompt = copy.deepcopy(self.video_question)
        prompt[1]["content"] = prompt[1]["content"]\
            .replace("<<BUSINESS OVERVIEW>>", business_overview)\
            .replace("<<RESEARCH OBJECTIVES>>", research_objectives)\
            .replace("<<COMPANY NAME>>", company_name)
        return prompt

    def get_matrix_oe_prompt(self, company_name: str, business_overview: str, research_objectives: str, existing_q: str, type_str: str):
        import copy
        prompt = copy.deepcopy(self.matrix_oe)
        prompt[0]["content"] = prompt[0]["content"].replace("<<COMPANY NAME>>", company_name)
        prompt[1]["content"] = prompt[1]["content"]\
            .replace("<<BUSINESS OVERVIEW>>", business_overview)\
            .replace("<<RESEARCH OBJECTIVES>>", research_objectives)\
            .replace("<<COMPANY NAME>>", company_name) + existing_q + f"\n{type_str}"
        return prompt
