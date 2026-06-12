class APIClient {
    constructor() {
        this.baseURL = this._getBaseURL();
        this.sessionId = null;
        this.token = null;
        this.user = null;
        this.loadAuthState();
    }

    _getBaseURL() {
        if (typeof window !== 'undefined' && window.location) {
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                return 'http://127.0.0.1:8000';
            }
            return window.location.origin + '/api';
        }
        return 'http://127.0.0.1:8000';
    }

    loadAuthState() {
        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('auth_user');
        if (storedToken && storedUser) {
            try {
                this.token = storedToken;
                this.user = JSON.parse(storedUser);
            } catch (e) {
                console.error('Failed to load auth state', e);
                this.logout();
            }
        }
    }

    saveAuthState(token, user) {
        this.token = token;
        this.user = user;
        if (token && user) {
            localStorage.setItem('auth_token', token);
            localStorage.setItem('auth_user', JSON.stringify(user));
        }
    }

    logout() {
        this.token = null;
        this.user = null;
        this.sessionId = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('interview_session_id');
    }

    isAuthenticated() {
        return !!this.token;
    }

    async getCurrentUser() {
        return this.request('/api/auth/me', 'GET');
    }

    async request(endpoint, method, data, isFormData = false) {
        const url = `${this.baseURL}${endpoint}`;
        const options = {
            method: method,
            headers: {},
        };

        if (this.token) {
            options.headers['Authorization'] = `Bearer ${this.token}`;
        }

        if (!isFormData && data) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(data);
        } else if (isFormData && data) {
            options.body = data;
        }

        console.log(`[API] 请求: ${method} ${url}`);
        console.log(`[API] 数据:`, data);

        try {
            const response = await fetch(url, options);
            console.log(`[API] 响应状态: ${response.status}`);

            if (!response.ok) {
                const errorText = await response.text();
                let userFriendlyMessage = this.getUserFriendlyError(response.status, errorText);
                console.error('[API] 请求失败:', userFriendlyMessage);
                if (response.status === 401) {
                    const wasLoggedIn = this.isAuthenticated();
                    this.logout();
                    if (wasLoggedIn) {
                        window.dispatchEvent(new CustomEvent('auth:logout'));
                    }
                }
                throw new Error(userFriendlyMessage);
            }

            const result = await response.json();
            console.log(`[API] 响应数据:`, result);
            return result;
        } catch (error) {
            console.error('[API] 请求异常:', error);
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                console.error('[API] 网络错误 - 可能后端服务未启动');
                throw new Error('网络连接失败，请检查后端服务是否启动');
            }
            throw error;
        }
    }

    getUserFriendlyError(status, errorText) {
        try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.detail) {
                const detail = errorJson.detail;
                if (Array.isArray(detail)) {
                    const msg = this._extractValidationError(detail);
                    if (msg) return msg;
                }
                if (typeof detail === 'string') {
                    return this.translateErrorMessage(detail);
                }
            }
        } catch (e) {
        }

        const errorMessages = {
            400: this.translateErrorMessage(errorText),
            401: '登录已过期，请重新登录',
            403: '您没有权限执行此操作',
            404: '请求的资源不存在',
            422: '请求参数格式不正确，请检查输入',
            500: '服务器内部错误，请稍后重试',
            502: '服务器网关错误，请稍后重试',
            503: '服务暂时不可用，请稍后重试',
        };

        return errorMessages[status] || `请求失败 (${status})`;
    }

    _extractValidationError(detail) {
        for (const d of detail) {
            if (!d.loc || !d.loc.length) continue;
            const field = d.loc[d.loc.length - 1];
            if (field === 'email') return '请输入正确的邮箱地址';
            if (field === 'username') return '请输入有效用户名（3-20个字符）';
            if (field === 'password') return '请输入有效密码（至少6个字符）';
            if (field === 'code') return '请输入6位验证码';
        }
        const first = detail[0];
        if (first && first.msg) return first.msg;
        return null;
    }

    translateErrorMessage(detail) {
        // 错误消息翻译映射
        const errorMappings = {
            '用户名已存在': '该用户名已被注册，请换一个用户名',
            '邮箱已被注册': '该邮箱已被注册，请换一个邮箱',
            '用户名或密码错误': '用户名或密码错误，请重新输入',
            '未提供认证令牌': '请先登录',
            '无效的认证令牌格式': '登录信息无效，请重新登录',
            '无效或过期的认证令牌': '登录已过期，请重新登录',
            '登录已过期，请重新登录': '登录已过期，请重新登录',
            '请先登录': '请先登录',
            '请先获取验证码': '请先点击发送验证码',
        };

        return errorMappings[detail] || detail;
    }

    async register(username, email, password, code) {
        const result = await this.request('/api/auth/register', 'POST', {
            username,
            email,
            password,
            code
        });
        this.saveAuthState(result.access_token, result.user);
        return result;
    }

    async sendRegisterCode(email) {
        return await this.request('/api/auth/send-register-code', 'POST', { email });
    }

    async login(username, password) {
        const result = await this.request('/api/auth/login', 'POST', {
            username,
            password
        });
        this.saveAuthState(result.access_token, result.user);
        return result;
    }

    async getCurrentUser() {
        return await this.request('/api/auth/me', 'GET');
    }

    async parseResume(file) {
        const formData = new FormData();
        formData.append('file', file);
        return await this.request('/api/interview/parse-resume', 'POST', formData, true);
    }

    async startInterview(resumeText = '', jobRole = 'java_backend') {
        const data = { job_role: jobRole };
        if (resumeText) {
            data.resume_text = resumeText;
        }
        if (this.sessionId) {
            data.session_id = this.sessionId;
        }
        const result = await this.request('/api/interview/start', 'POST', data);
        this.sessionId = result.session_id;
        return result;
    }

    async sendMessage(message) {
        if (!this.sessionId) {
            throw new Error('请先开始面试');
        }
        const result = await this.request('/api/interview/chat', 'POST', {
            session_id: this.sessionId,
            user_message: message
        });
        return result.reply;
    }

    async endInterview() {
        if (!this.sessionId) {
            throw new Error('没有进行中的面试');
        }
        const result = await this.request('/api/interview/end', 'POST', {
            session_id: this.sessionId
        });
        this.sessionId = null;
        return result.summary;
    }

    async getInterviewHistory() {
        const result = await this.request('/api/interview/history', 'GET');
        return result.interviews;
    }

    async getInterviewDetail(sessionId) {
        return await this.request(`/api/interview/history/${sessionId}`, 'GET');
    }

    async deleteInterview(sessionId) {
        return await this.request(`/api/interview/history/${sessionId}`, 'DELETE');
    }

    async getResumeInfo() {
        return await this.request('/api/interview/resume', 'GET');
    }

    async checkResumeExists() {
        const result = await this.request('/api/interview/resume/exists', 'GET');
        return result.exists;
    }

    async saveResume(text, filename = '') {
        const formData = new FormData();
        formData.append('text', text);
        formData.append('filename', filename);
        return await this.request('/api/interview/resume', 'POST', formData, true);
    }

    async deleteResume() {
        return await this.request('/api/interview/resume', 'DELETE');
    }

    async forgotPassword(username, email) {
        return await this.request('/api/auth/forgot-password', 'POST', { username, email });
    }

    async resetPassword(username, email, code, newPassword) {
        return await this.request('/api/auth/reset-password', 'POST', {
            username, email, code, new_password: newPassword
        });
    }
}

const apiClient = new APIClient();
