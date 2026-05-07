// 语音识别模块（使用Web Speech API）
class AudioRecorder {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.onResult = null;
        this.onError = null;
        this.onEnd = null;
        this.init();
    }

    init() {
        // 检查浏览器支持
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.error('浏览器不支持Web Speech API');
            return;
        }
        
        // 创建识别对象
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        // 配置
        this.recognition.continuous = false;  // 单次识别（说话停顿后自动结束）
        this.recognition.interimResults = false;  // 只返回最终结果
        this.recognition.lang = 'zh-CN';  // 中文
        this.recognition.maxAlternatives = 1;
        
        // 绑定事件
        this.recognition.onresult = (event) => {
            const result = event.results[0][0].transcript;
            if (this.onResult) {
                this.onResult(result);
            }
        };
        
        this.recognition.onerror = (event) => {
            console.error('语音识别错误:', event.error);
            if (this.onError) {
                this.onError(event.error);
            }
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            if (this.onEnd) {
                this.onEnd();
            }
        };
    }

    startListening() {
        if (!this.recognition) {
            console.error('语音识别未初始化');
            return false;
        }
        
        if (this.isListening) {
            return false;
        }
        
        try {
            this.recognition.start();
            this.isListening = true;
            return true;
        } catch (error) {
            console.error('启动语音识别失败:', error);
            return false;
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }
}

// 创建全局实例
const audioRecorder = new AudioRecorder();