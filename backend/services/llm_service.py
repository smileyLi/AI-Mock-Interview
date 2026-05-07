from openai import OpenAI
from typing import List, Dict
from ..config import Config
from ..prompts.system_prompt import get_system_prompt

class LLMService:
    """DeepSeek API服务（你原DeepSeekChat的核心逻辑）"""
    
    def __init__(self):
        self.client = OpenAI(
            api_key=Config.DEEPSEEK_API_KEY,
            base_url=Config.DEEPSEEK_BASE_URL
        )
    
    def chat(self, history: List[Dict[str, str]], user_message: str) -> str:
        """
        发送消息给LLM
        :param history: 历史消息列表
        :param user_message: 当前用户消息
        :return: AI回复
        """
        try:
            # 构建消息列表
            messages = [
                {"role": "system", "content": get_system_prompt()}
            ]
            messages.extend(history)
            messages.append({"role": "user", "content": user_message})
            
            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=messages,
                temperature=Config.TEMPERATURE,
                max_tokens=Config.MAX_TOKENS
            )
            
            reply = response.choices[0].message.content
            return reply
            
        except Exception as e:
            print(f"LLM API错误: {e}")
            return "抱歉，我遇到了一些问题，请稍后重试。"
    
    def get_first_question(self) -> str:
        """获取第一个面试问题"""
        # 用一个特殊消息来触发第一个问题
        return self.chat([], "请开始面试，首先让候选人做自我介绍。")
    
    def end_interview(self, history: List[Dict[str, str]]) -> str:
        """结束面试并获取总结"""
        return self.chat(history, "面试结束，请按要求输出结构化总结。")