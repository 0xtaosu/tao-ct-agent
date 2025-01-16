# TAO CT Agent

一个基于 Node.js 的 Twitter 自动回复机器人，使用 DeepSeek API 生成智能回复内容。

## 功能特点

- 自动监控关注账号的新推文
- 使用 DeepSeek API 生成个性化回复
- 自动跳过转发和回复内容
- 防重复回复机制
- 错误处理和日志记录

## 前置要求

- Node.js (v14.0.0 或更高版本)
- Twitter 账号
- DeepSeek API 密钥

## 安装

1. 克隆仓库：

```bash
git clone https://github.com/0xtaosu/tao-ct-agent.git
cd tao-ct-agent
```
2. 安装依赖：

```bash
npm install
```
3. 配置环境变量：
   - 复制 `.env.example` 到 `.env`
   - 填写必要的配置信息：
     - Twitter 账号信息
     - DeepSeek API 密钥
     - Twitter API 凭证（如需要）

## 使用方法

1. 确保所有配置都已正确设置
2. 运行机器人： 

```bash
chmod +x start.sh
./start.sh
```


## 工作原理

1. 机器人每 5 分钟检查一次时间线上的新推文
2. 对于每条新推文：
   - 检查是否已经处理过
   - 排除转发和回复
   - 使用 DeepSeek API 生成回复内容
   - 发送回复

## 注意事项

- 请遵守 Twitter 的自动化规则和政策
- 建议适当调整检查间隔时间，避免触发限制
- 定期检查日志确保正常运行
- 注意 API 使用限制和成本

## 项目结构
```
.
├── bot.js
├── main.js
├── start.sh
├── .env
├── .env.example
├── README.md
└── package.json
```

## 贡献

欢迎提交 Issues 和 Pull Requests 来改进这个项目。

## 许可证

[MIT License](LICENSE)

## 致谢

- [agent-twitter-client](https://github.com/elizaOS/agent-twitter-client)
- [DeepSeek API](https://www.deepseek.com/)
