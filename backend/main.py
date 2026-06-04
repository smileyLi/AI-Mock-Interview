from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from .config import Config
from .services.interview_service import InterviewService
from .services.auth_service import AuthService
from .services.email_verification_service import EmailVerificationService
from .utils.user_manager import UserManager
from .models.user import UserRegister, UserLogin, UserResponse, TokenResponse
from .models.user import SendRegisterCodeRequest, ForgotPasswordRequest, ResetPasswordRequest, MessageResponse
from .models.schemas import (
    ChatRequest, ChatResponse,
    StartInterviewRequest, StartInterviewResponse,
    EndInterviewRequest, EndInterviewResponse,
    InterviewListResponse, DeleteInterviewResponse,
    ParseResumeResponse,
    ResumeInfoResponse, SaveResumeResponse, ResumeExistsResponse,
)
from .utils.resume_parser import extract_text_from_upload


app = FastAPI(title="AI面试系统API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

interview_service = InterviewService()
auth_service = AuthService()
user_manager = UserManager()
verification_service = EmailVerificationService()


async def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="未提供认证令牌")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="无效的认证令牌格式")
    token = authorization[7:]
    user_id = auth_service.get_user_id_from_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="无效或过期的认证令牌")
    return user_id


@app.get("/")
async def root():
    return {"message": "AI面试系统API运行中", "status": "ok"}


@app.post("/api/auth/send-register-code", response_model=MessageResponse)
async def send_register_code(data: SendRegisterCodeRequest):
    try:
        verification_service.send_register_code(data.email)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"邮件发送失败: {str(e)}")
    return MessageResponse(success=True, message="验证码已发送至您的邮箱")


@app.post("/api/auth/register", response_model=TokenResponse)
async def register(data: UserRegister):
    try:
        user = verification_service.register_with_code(
            data.username, data.email, data.password, data.code
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"注册失败: {str(e)}")

    access_token = auth_service.create_access_token(user)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=auth_service.to_user_response(user)
    )


@app.post("/api/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = user_manager.get_user_by_username(data.username)
    if not user:
        raise HTTPException(status_code=400, detail="用户名或密码错误")
    
    if not user_manager.verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="用户名或密码错误")
    
    access_token = auth_service.create_access_token(user)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=auth_service.to_user_response(user)
    )


@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_info(user_id: str = Depends(get_current_user_id)):
    user = user_manager.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return auth_service.to_user_response(user)


@app.post("/api/auth/forgot-password", response_model=MessageResponse)
async def forgot_password(data: ForgotPasswordRequest):
    try:
        verification_service.send_reset_code(data.username, data.email)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"邮件发送失败: {str(e)}")
    return MessageResponse(success=True, message="验证码已发送至您的邮箱")


@app.post("/api/auth/reset-password", response_model=MessageResponse)
async def reset_password(data: ResetPasswordRequest):
    try:
        verification_service.reset_password_with_code(
            data.username, data.email, data.code, data.new_password
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return MessageResponse(success=True, message="密码重置成功，请返回登录")


@app.post("/api/interview/parse-resume", response_model=ParseResumeResponse)
async def parse_resume(file: UploadFile = File(...), _: str = Depends(get_current_user_id)):
    data = await file.read()
    if len(data) > Config.MAX_RESUME_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="文件过大")
    try:
        text = extract_text_from_upload(file.filename or "resume", data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    truncated = False
    if len(text) > Config.RESUME_MAX_CHARS:
        text = text[: Config.RESUME_MAX_CHARS]
        truncated = True
    return ParseResumeResponse(text=text, truncated=truncated, filename=file.filename or "")


@app.post("/api/interview/start", response_model=StartInterviewResponse)
async def start_interview(request: StartInterviewRequest, user_id: str = Depends(get_current_user_id)):
    try:
        session_id, first_question = interview_service.start_interview(
            user_id,
            request.session_id,
            request.resume_text,
            request.job_role,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return StartInterviewResponse(session_id=session_id, first_question=first_question)


@app.post("/api/interview/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, user_id: str = Depends(get_current_user_id)):
    if not request.session_id:
        raise HTTPException(status_code=400, detail="session_id不能为空")
    if not request.user_message:
        raise HTTPException(status_code=400, detail="user_message不能为空")
    try:
        reply = interview_service.chat(user_id, request.session_id, request.user_message)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return ChatResponse(reply=reply, session_id=request.session_id)


@app.post("/api/interview/end", response_model=EndInterviewResponse)
async def end_interview(request: EndInterviewRequest, user_id: str = Depends(get_current_user_id)):
    if not request.session_id:
        raise HTTPException(status_code=400, detail="session_id不能为空")
    summary = interview_service.end_interview(user_id, request.session_id)
    return EndInterviewResponse(summary=summary)


@app.get("/api/interview/history", response_model=InterviewListResponse)
async def get_interview_history(user_id: str = Depends(get_current_user_id)):
    interviews = interview_service.get_all_interviews(user_id)
    return InterviewListResponse(interviews=interviews, total=len(interviews))


@app.get("/api/interview/history/{session_id}")
async def get_interview_detail(session_id: str, user_id: str = Depends(get_current_user_id)):
    interview = interview_service.get_interview(user_id, session_id)
    if not interview:
        raise HTTPException(status_code=404, detail="面试记录不存在")
    return interview


@app.delete("/api/interview/history/{session_id}", response_model=DeleteInterviewResponse)
async def delete_interview(session_id: str, user_id: str = Depends(get_current_user_id)):
    success = interview_service.delete_interview(user_id, session_id)
    if success:
        return DeleteInterviewResponse(success=True, message="面试记录删除成功")
    else:
        return DeleteInterviewResponse(success=False, message="面试记录不存在")


@app.get("/api/interview/resume", response_model=ResumeInfoResponse)
async def get_resume_info(user_id: str = Depends(get_current_user_id)):
    saved = interview_service.load_saved_resume(user_id)
    if saved:
        return ResumeInfoResponse(
            exists=True,
            text=saved.get("text", ""),
            filename=saved.get("filename", ""),
            saved_at=saved.get("saved_at", ""),
            char_count=saved.get("char_count", 0),
        )
    return ResumeInfoResponse(exists=False)


@app.get("/api/interview/resume/exists", response_model=ResumeExistsResponse)
async def check_resume_exists(user_id: str = Depends(get_current_user_id)):
    exists = interview_service.has_saved_resume(user_id)
    return ResumeExistsResponse(exists=exists)


@app.post("/api/interview/resume", response_model=SaveResumeResponse)
async def save_resume(text: str = Form(...), filename: str = Form(""), user_id: str = Depends(get_current_user_id)):
    if not text or not text.strip():
        return SaveResumeResponse(success=False, message="简历内容不能为空")
    success = interview_service.save_resume(user_id, text.strip(), filename)
    if success:
        return SaveResumeResponse(success=True, message="简历保存成功")
    return SaveResumeResponse(success=False, message="保存失败")


@app.delete("/api/interview/resume", response_model=SaveResumeResponse)
async def delete_resume(user_id: str = Depends(get_current_user_id)):
    success = interview_service.delete_saved_resume(user_id)
    if success:
        return SaveResumeResponse(success=True, message="简历已删除")
    return SaveResumeResponse(success=False, message="未找到保存的简历")