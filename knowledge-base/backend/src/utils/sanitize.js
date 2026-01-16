const xss = require('xss');

// XSS 过滤配置
const xssOptions = {
    whiteList: {}, // 不允许任何 HTML 标签（纯文本）
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script']
};

// 富文本 XSS 过滤配置（允许部分安全标签）
const richTextOptions = {
    whiteList: {
        p: [],
        br: [],
        strong: [],
        b: [],
        em: [],
        i: [],
        u: [],
        h1: [], h2: [], h3: [], h4: [], h5: [], h6: [],
        ul: [], ol: [], li: [],
        blockquote: [],
        pre: [], code: ['class'],
        a: ['href', 'title', 'target'],
        img: ['src', 'alt', 'title'],
        table: [], thead: [], tbody: [], tr: [], th: [], td: [],
        hr: [],
        span: ['style'],
        div: ['style']
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style']
};

/**
 * 过滤纯文本输入（标题、描述等）
 */
function sanitizeText(input) {
    if (!input) return input;
    return xss(String(input), xssOptions).trim();
}

/**
 * 过滤富文本/HTML 内容
 */
function sanitizeHtml(input) {
    if (!input) return input;
    return xss(String(input), richTextOptions);
}

/**
 * 过滤 URL
 */
function sanitizeUrl(input) {
    if (!input) return input;
    const url = String(input).trim();
    // 只允许 http/https 协议
    if (/^https?:\/\//i.test(url)) {
        return url;
    }
    // 如果没有协议，添加 https
    if (/^[a-zA-Z0-9]/.test(url) && !url.includes(':')) {
        return 'https://' + url;
    }
    return null; // 无效 URL
}

module.exports = { sanitizeText, sanitizeHtml, sanitizeUrl };
