// 主逻辑
class InterviewApp {
    constructor() {
        this.isInterviewActive = false;
        this.currentSessionId = null;
        this.isRecording = false;
        this.currentDetailSessionId = null;

        this.chatArea = document.getElementById('chatArea');
        this.startBtn = document.getElementById('startBtn');
        this.recordBtn = document.getElementById('recordBtn');
        this.endBtn = document.getElementById('endBtn');
        this.historyBtn = document.getElementById('historyBtn');
        this.statusDiv = document.getElementById('status');
        this.manualInput = document.getElementById('manualInput');
        this.sendBtn = document.getElementById('sendBtn');

        this.historyModal = document.getElementById('historyModal');
        this.historyDetailModal = document.getElementById('historyDetailModal');
        this.historyList = document.getElementById('historyList');
        this.historyDetail = document.getElementById('historyDetail');
        this.detailTitle = document.getElementById('detailTitle');
        this.deleteHistoryBtn = document.getElementById('deleteHistoryBtn');

        this.init();
    }

    init() {
        this.startBtn.addEventListener('click', () => this.startInterview());
        this.recordBtn.addEventListener('click', () => this.toggleRecording());
        this.endBtn.addEventListener('click', () => this.endInterview());
        this.historyBtn.addEventListener('click', () => this.showHistory());
        this.sendBtn.addEventListener('click', () => this.sendManualMessage());
        this.manualInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendManualMessage();
        });

        document.querySelector('.close').addEventListener('click', () => {
            this.historyModal.style.display = 'none';
        });
        document.querySelector('.close-detail').addEventListener('click', () => {
            this.historyDetailModal.style.display = 'none';
        });
        document.getElementById('closeDetailBtn').addEventListener('click', () => {
            this.historyDetailModal.style.display = 'none';
        });
        this.deleteHistoryBtn.addEventListener('click', () => this.deleteCurrentHistory());

        window.addEventListener('click', (e) => {
            if (e.target === this.historyModal) {
                this.historyModal.style.display = 'none';
            }
            if (e.target === this.historyDetailModal) {
                this.historyDetailModal.style.display = 'none';
            }
        });

        audioRecorder.onResult = (text) => this.handleUserInput(text);
        audioRecorder.onError = (error) => {
            this.updateStatus(`语音识别错误: ${error}`, 'error');
            this.isRecording = false;
            this.recordBtn.textContent = '🎙️ 按住说话';
            this.recordBtn.classList.remove('recording');
        };
        audioRecorder.onEnd = () => {
            this.isRecording = false;
            this.recordBtn.textContent = '🎙️ 按住说话';
            this.recordBtn.classList.remove('recording');
        };

        audioPlayer.onStart = () => {
            this.updateStatus('面试官正在说话...', 'info');
        };
        audioPlayer.onEnd = () => {
            this.updateStatus('等待您的回答...', 'info');
            if (this.isInterviewActive) {
                this.enableRecording(true);
            }
        };
    }

    updateStatus(message, type = 'info') {
        this.statusDiv.textContent = message;
        this.statusDiv.style.color = type === 'error' ? '#dc2626' : '#495057';
    }

    addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;

        const roleSpan = document.createElement('span');
        roleSpan.className = 'role';

        if (role === 'user') {
            roleSpan.textContent = '👤 您';
        } else if (role === 'assistant') {
            roleSpan.textContent = '🎯 面试官';
        } else {
            roleSpan.textContent = '🤖 系统';
        }

        const contentP = document.createElement('p');
        contentP.textContent = content;

        messageDiv.appendChild(roleSpan);
        messageDiv.appendChild(contentP);

        this.chatArea.appendChild(messageDiv);
        this.chatArea.scrollTop = this.chatArea.scrollHeight;
    }

    enableRecording(enabled) {
        this.recordBtn.disabled = !enabled;
        this.manualInput.disabled = !enabled;
        this.sendBtn.disabled = !enabled;

        if (enabled) {
            this.updateStatus('可以说话了，点击"按住说话"按钮进行语音输入');
        } else {
            this.updateStatus('面试官正在说话，请稍等...');
        }
    }

    async startInterview() {
        this.updateStatus('正在开始面试...');

        try {
            const result = await apiClient.startInterview();
            this.currentSessionId = result.session_id;
            this.isInterviewActive = true;

            this.startBtn.disabled = true;
            this.endBtn.disabled = false;
            this.enableRecording(true);

            this.chatArea.innerHTML = '';

            this.addMessage('assistant', result.first_question);

            audioPlayer.speak(result.first_question);

            this.updateStatus('面试进行中...');

        } catch (error) {
            console.error('开始面试失败:', error);
            this.updateStatus('开始面试失败，请检查后端服务是否启动', 'error');
        }
    }

    async toggleRecording() {
        if (!this.isInterviewActive) {
            this.updateStatus('请先开始面试', 'error');
            return;
        }

        if (this.isRecording) {
            audioRecorder.stopListening();
        } else {
            this.updateStatus('请开始说话...', 'info');
            const started = audioRecorder.startListening();
            if (started) {
                this.isRecording = true;
                this.recordBtn.textContent = '🔴 录音中... 点击停止';
                this.recordBtn.classList.add('recording');
            } else {
                this.updateStatus('无法启动麦克风，请检查权限', 'error');
            }
        }
    }

    async handleUserInput(text) {
        if (!this.isInterviewActive) {
            this.updateStatus('面试未开始', 'error');
            return;
        }

        if (!text || text.trim() === '') {
            this.updateStatus('未识别到有效内容，请重新说话', 'error');
            this.enableRecording(true);
            return;
        }

        this.addMessage('user', text);

        this.enableRecording(false);
        this.updateStatus('正在处理您的回答...');

        try {
            const reply = await apiClient.sendMessage(text);

            this.addMessage('assistant', reply);

            audioPlayer.speak(reply);

        } catch (error) {
            console.error('发送消息失败:', error);
            this.updateStatus('发送失败，请重试', 'error');
            this.enableRecording(true);
        }
    }

    async sendManualMessage() {
        const text = this.manualInput.value.trim();
        if (!text) return;

        this.manualInput.value = '';
        await this.handleUserInput(text);
    }

    async endInterview() {
        if (!this.isInterviewActive) {
            return;
        }

        this.updateStatus('正在结束面试，生成总结...');
        this.enableRecording(false);
        this.endBtn.disabled = true;

        try {
            const summary = await apiClient.endInterview();

            this.addMessage('system', '========== 面试总结 ==========');
            this.addMessage('system', summary);
            this.addMessage('system', '==============================');

            audioPlayer.speak('面试结束，以下是您的面试总结：' + summary);

            this.isInterviewActive = false;
            this.startBtn.disabled = false;
            this.currentSessionId = null;
            this.updateStatus('面试已结束，点击"开始面试"重新开始');

        } catch (error) {
            console.error('结束面试失败:', error);
            this.updateStatus('结束面试失败', 'error');
            this.endBtn.disabled = false;
        }
    }

    async showHistory() {
        try {
            const interviews = await apiClient.getInterviewHistory();

            if (interviews.length === 0) {
                this.historyList.innerHTML = '<p class="empty-history">暂无面试记录</p>';
            } else {
                this.historyList.innerHTML = interviews.map(interview => `
                    <div class="history-item" data-session-id="${interview.session_id}">
                        <div class="history-info">
                            <span class="history-date">${this.formatDate(interview.created_at)}</span>
                            <span class="history-session-id">会话ID: ${interview.session_id}</span>
                        </div>
                        <div class="history-preview">
                            ${interview.summary ? interview.summary.substring(0, 100) + '...' : '暂无总结'}
                        </div>
                        <button class="btn btn-small btn-primary view-detail-btn">查看详情</button>
                    </div>
                `).join('');

                this.historyList.querySelectorAll('.view-detail-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const sessionId = e.target.closest('.history-item').dataset.sessionId;
                        this.showHistoryDetail(sessionId);
                    });
                });
            }

            this.historyModal.style.display = 'block';

        } catch (error) {
            console.error('获取历史记录失败:', error);
            this.updateStatus('获取历史记录失败', 'error');
        }
    }

    async showHistoryDetail(sessionId) {
        try {
            const interview = await apiClient.getInterviewDetail(sessionId);
            this.currentDetailSessionId = sessionId;

            this.detailTitle.textContent = `面试详情 - ${this.formatDate(interview.created_at)}`;

            let detailHTML = '<div class="detail-messages">';
            interview.messages.forEach(msg => {
                const roleClass = msg.role === 'user' ? 'user' : 'assistant';
                const roleText = msg.role === 'user' ? '👤 您' : '🎯 面试官';
                detailHTML += `
                    <div class="message ${roleClass}">
                        <span class="role">${roleText}</span>
                        <p>${msg.content}</p>
                    </div>
                `;
            });
            detailHTML += '</div>';

            if (interview.summary) {
                detailHTML += `
                    <div class="detail-summary">
                        <h3>📊 面试总结</h3>
                        <p>${interview.summary}</p>
                    </div>
                `;
            }

            this.historyDetail.innerHTML = detailHTML;
            this.historyDetailModal.style.display = 'block';

        } catch (error) {
            console.error('获取详情失败:', error);
            this.updateStatus('获取面试详情失败', 'error');
        }
    }

    async deleteCurrentHistory() {
        if (!this.currentDetailSessionId) return;

        if (!confirm('确定要删除这条面试记录吗？')) return;

        try {
            const result = await apiClient.deleteInterview(this.currentDetailSessionId);

            if (result.success) {
                this.historyDetailModal.style.display = 'none';
                this.showHistory();
                this.updateStatus('面试记录已删除', 'info');
            } else {
                this.updateStatus(result.message, 'error');
            }

        } catch (error) {
            console.error('删除失败:', error);
            this.updateStatus('删除失败', 'error');
        }
    }

    formatDate(dateStr) {
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new InterviewApp();
});
