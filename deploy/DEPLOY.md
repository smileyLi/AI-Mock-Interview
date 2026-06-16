# AI模拟面试系统 - Ubuntu 服务器部署指南

> 本文档指导你将项目部署到 Ubuntu 云服务器上，使外部用户可通过浏览器访问。

---

## 一、部署架构

```
用户浏览器 (https://xxx.nip.io)
        │
        ▼
   ┌──────────┐
   │  Nginx   │  端口 80/443 → HTTPS 终止 + 静态文件 + API 反向代理
   └──────────┘
        │
        ├── /          → /opt/ai-interview/frontend/  (静态网页)
        └── /api/*     → http://127.0.0.1:8000/api/*  (FastAPI 后端)
                                │
                        ┌──────────────┐
                        │  run.py      │  systemd 守护
                        │  (uvicorn)   │  端口 8000 (仅本地)
                        └──────────────┘
```

> **关键**：Nginx 把前端和后端统一到同一个域名/端口下，前端 JS 请求 `/api/xxx` 是同源请求，不会有跨域问题。

---

## 二、前提准备

| 你需要准备 | 说明 |
|---|---|
| 服务器公网 IP | 云服务器控制台可查看 |
| DeepSeek API Key | 在 [platform.deepseek.com](https://platform.deepseek.com) 获取 |
| QQ 邮箱 + SMTP 授权码 | 用于发送注册验证码。QQ邮箱 → 设置 → 账户 → POP3/SMTP服务 → 生成授权码 |
| SSH 客户端 | Windows 自带（PowerShell 中直接可用 `ssh` 和 `scp`），如不行则装 [Git for Windows](https://git-scm.com/download/win) |

> ⚠️ **重要**：你的本地是 Windows，服务器是 Ubuntu。所有在服务器上运行的脚本（`.sh`、`.conf`、`.service`）**必须使用 LF 换行符**（不是 Windows 默认的 CRLF）。如果你用 Git 克隆项目，通常没问题；如果你手动复制文件，可能出错。服务器上出现 `^M` 或 `/bin/bash^M: bad interpreter` 错误就是这个原因。

---

## 三、将代码上传到服务器

以下所有命令在 **本地 Windows PowerShell** 中执行。`<服务器IP>` 替换为你的公网 IP。

### 方式一：使用 tar（Windows 10 1803+ 自带）

```powershell
# 1. 在项目根目录打包（PowerShell 中执行）
cd C:\Users\ASUS\Desktop\Project\SoftwareManage\AI-Mock-Interview
tar -czf ai-interview.tar.gz --exclude=models --exclude=data/chroma_db --exclude=.git --exclude=__pycache__ --exclude=*.pyc .

# 2. 上传到服务器
scp ai-interview.tar.gz root@<服务器IP>:/root/

# 3. SSH 登录服务器
ssh root@<服务器IP>
```

> 如果提示 `tar : 无法将"tar"项识别为 cmdlet...`，说明你的 Windows 版本较旧，请用下面的方式二。

### 方式二：直接用 scp 传整个文件夹（不打包）

```powershell
# 直接上传项目文件夹（排除大文件，但会逐文件传输，速度较慢但最简单）
scp -r root@<服务器IP>:/root/
```

> 如果 `scp` 也提示不可用，安装 [Git for Windows](https://git-scm.com/download/win)，安装后在 Git Bash 中执行上面的命令。

### 方式三：用 Git（如果你用 Git 管理代码）

```powershell
# 推送到 GitHub/Gitee，然后在服务器上 pull
ssh root@<服务器IP>
cd /opt && git clone <你的仓库地址> ai-interview
```

---

### 登录服务器后，解压并准备

```bash
# 以下命令在服务器上执行（SSH 登录后）
mkdir -p /opt/ai-interview

# 如果是 tar 包上传（方式一）
tar -xzf /root/ai-interview.tar.gz -C /opt/ai-interview

# 如果是直接 scp 文件夹（方式二），跳过上面那条

cd /opt/ai-interview
ls -la          # 确认文件都在

# 给脚本添加执行权限
chmod +x deploy/setup.sh
```

---

## 四、安装依赖（服务器端）

```bash
# 更新系统
apt-get update

# 安装基础软件
apt-get install -y python3 python3-pip python3-venv nginx certbot python3-certbot-nginx

# 安装 Python 依赖（使用清华源加速，Ubuntu 24.04 需加 --break-system-packages）
pip3 install --break-system-packages -r /opt/ai-interview/backend/requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

---

## 五、配置环境变量

```bash
nano /opt/ai-interview/.env
```

填入以下内容（替换 `xxx` 为你的真实值）：

```ini
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
JWT_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx（至少32字符，随便敲）
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=你的QQ号@qq.com
SMTP_PASSWORD=你的QQ邮箱SMTP授权码
ALLOWED_ORIGINS=https://你的IP.nip.io
HOST=127.0.0.1
PORT=8000
LOG_FILE_ENABLED=true
```

> **注意**：`HOST=127.0.0.1` 是故意这样写的。后端只监听本地，由 Nginx 反向代理对外暴露，这样更安全。

---

## 六、配置 Nginx

### 6.1 先跑通 HTTP

用你的服务器公网 IP 替换配置文件中的 `{YOUR_IP}`：

```bash
cd /opt/ai-interview
PUBLIC_IP=$(curl -s ifconfig.me)    # 自动获取公网IP
echo "你的公网 IP 是: $PUBLIC_IP"

# 替换配置文件中的占位符
sed -i "s/{YOUR_IP}/${PUBLIC_IP}/g" deploy/nginx.conf

# 部署 Nginx 配置
cp deploy/nginx.conf /etc/nginx/sites-available/interview
ln -sf /etc/nginx/sites-available/interview /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

### 6.2 验证

浏览器打开 `http://你的IP.nip.io`，你应该能看到登录页面。

> （nip.io 是一个免费 DNS 服务，`<IP>.nip.io` 自动解析到对应 IP，无需购买域名）

---

## 七、配置 HTTPS（语音功能必需）

> Web Speech API 强制要求 HTTPS 或 localhost。没有 HTTPS，语音识别和朗读无法使用。

### 7.1 尝试 Let's Encrypt（推荐）

```bash
certbot --nginx -d 你的IP.nip.io
```

按提示输入邮箱即可。成功后 certbot 会自动修改 Nginx 配置添加 HTTPS。

### 7.2 如果 certbot 失败（自签证书备选）

Let's Encrypt 对 nip.io 有频率限制，如果申请失败：

```bash
# 生成自签证书
mkdir -p /etc/nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/interview.key \
    -out /etc/nginx/ssl/interview.crt \
    -subj "/CN=你的IP.nip.io"
```

然后手动修改 `/etc/nginx/sites-available/interview`，把注释掉的 HTTPS server 块取消注释，把证书路径改为：
```
ssl_certificate     /etc/nginx/ssl/interview.crt;
ssl_certificate_key /etc/nginx/ssl/interview.key;
```

然后 `nginx -t && systemctl reload nginx`。

> 自签证书浏览器会显示"不安全"警告，点击"高级 → 继续访问"即可。语音功能可以正常使用。

---

## 八、启动后端服务

### 8.1 注册 systemd 服务

```bash
cp /opt/ai-interview/deploy/interview.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable interview
systemctl start interview
```

### 8.2 检查状态

```bash
systemctl status interview    # 应该显示 active (running)
systemctl status nginx        # 应该显示 active (running)
```

### 8.3 查看日志

```bash
journalctl -u interview -f    # 实时查看日志
journalctl -u interview -n 50 # 最近 50 行
```

---

## 九、验证部署

1. 浏览器打开 `https://你的IP.nip.io`
2. 注册一个账号（需要邮箱验证码）
3. 登录后，选择岗位，点击「开始面试」
4. 测试语音功能：按住说话 + AI 朗读

---

## 十、常见问题

| 问题 | 解决 |
|------|------|
| `/bin/bash^M: bad interpreter` | Windows 换行符问题。在服务器上执行：`sed -i 's/\r$//' deploy/setup.sh deploy/interview.service` |
| Nginx 报 502 错误 | 后端未启动：`systemctl start interview`。查看日志：`journalctl -u interview -n 30` |
| 启动后端后立即 crash | 先检查 .env 是否配置正确：`cat /opt/ai-interview/.env`。再手动启动看报错：`cd /opt/ai-interview && python3 run.py --production` |
| API 提示"网络连接失败" | 检查 Nginx 代理是否生效；检查后端是否在 8000 端口运行：`curl http://127.0.0.1:8000/` |
| 注册收不到邮件 | 检查 QQ 邮箱 SMTP 授权码是否正确（不是 QQ 密码）；确认服务器 465 端口未被封 |
| 语音按钮没反应 | 确认使用 HTTPS 访问；确认浏览器是 Chrome 或 Edge；确认不是用 HTTP |
| 页面空白 | 检查浏览器控制台（F12）；确认 Nginx `root` 指向 `/opt/ai-interview/frontend` |
| DeepSeek API 报错 | 确认 API Key 正确；确认服务器能访问外网 (`curl https://api.deepseek.com`) |
| Ubuntu 24.04 pip 报错 `externally-managed-environment` | 已经加了 `--break-system-packages`，如果还报错就创建虚拟环境：`python3 -m venv venv && source venv/bin/activate && pip3 install -r ...` |

---

## 十一、更新代码

```powershell
# === 以下在本地 Windows PowerShell 执行 ===
cd C:\Users\ASUS\Desktop\Project\SoftwareManage\AI-Mock-Interview

# 方式一：tar 打包上传
tar -czf ai-interview.tar.gz --exclude=models --exclude=data/chroma_db --exclude=.git --exclude=__pycache__ .
scp ai-interview.tar.gz root@<服务器IP>:/root/

# 方式二：如果项目不大，直接用 scp -r 覆盖
# scp -r backend frontend data run.py deploy root@<服务器IP>:/opt/ai-interview/

# === 以下在服务器上执行 ===
ssh root@<服务器IP>

# 如果用的 tar 包
tar -xzf /root/ai-interview.tar.gz -C /opt/ai-interview

# 重启服务
systemctl restart interview
systemctl reload nginx
```

---

## 十二、停止服务

```bash
systemctl stop interview
systemctl stop nginx
```
