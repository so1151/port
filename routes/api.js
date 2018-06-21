const express = require('express');
const router = express.Router();
const crypto = require('crypto')//加密
const validator = require('validator')//验证
const session = require('express-session')
const emailjs = require('emailjs')//发送邮件
const path = require('path');
const fs = require('fs')
const emailServer = emailjs.server.connect({
    user: "miss_wangyamin@qq.com",
    password: "yktffrxfcpbjhiej",
    host: "smtp.qq.com",
    ssl: true
})

//登录注册接口
router.post('/users', (req, res, next) => {
    const { query, db, body } = req;
    const { request } = query;
    //登录
    if (request == 'login') {
        const { account, password } = body;
        let error = {}
        if (!account) {//判断账号不能为空
            error['account'] = "账号不能为空!";
        }
        if (!password) {//判断密码不能为空
            error['password'] = "密码不能为空!";
        }

        if (Object.keys(error).length == 0) {
            let where = {};
            if (validator.isEmail(account)) {//判断传过来的参数是账号/手机/邮箱
                where['email'] = account;
            } else if (validator.isMobilePhone(account, 'zh-CN')) {
                where['phone'] = account;
            } else {
                where['account'] = account;
            }
            db.collection('users').find(where, function (err, result) {
                if (result.length > 0) {
                    let passwd = crypto.createHash('md5').update(password).digest('hex');
                    if (passwd == result[0].password) {

                        res.statusCode = 200;
                        req.session.user = result[0];
                        delete result[0].password;
                        res.json({
                            code:1,
                            error,
                            message: "登录成功",
                            data: result[0]
                        })
                    } else {
                        // res.statusCode = 500;
                        res.json({
                            code: 0,
                            error: {
                                password: "密码不正确！"
                            },
                            message: "登录失败，参数不正确！",
                            data: {}
                        })
                    }
                } else {
                    // res.statusCode = 500;
                    res.json({
                        code: 0,
                        error: {
                            account: "当前账号不存在！"
                        },
                        message: "登录失败，参数不正确！",
                        data: {}
                    })
                }
            })
        } else {//如果有错误
            res.statusCode = 200;
            res.json({
                code: 0,
                error,
                message: "登录失败，参数不正确！",
                data: {}
            })
        }


    }

    //注册
    if (request == 'register') {
        const { account, phone, email, password, valid } = body;
        let error = {};
        //判断传参是否为空
        if (!account) error['account'] = "账号不能为空!";
        if (phone) {//判断手机格式是否正确
            if (!validator.isMobilePhone(phone, 'zh-CN')) error['phone'] = "手机格式不正确！"
        } else {
            error['phone'] = "手机号不能为空!";
        }
        if (email) {
            if (!validator.isEmail(email)) error['email'] = "邮箱格式不正确！";
        } else {
            error['email'] = "邮箱不能为空！";
        }
        if (!valid) error['valid'] = "验证码不能为空!";
        if (!password) error['password'] = "密码不能为空";

        if (Object.keys(error).length == 0) {//如果参数都非空
            if(req.session.emailCode != valid){
                res.json({
                    code: 0,
                    error:{
                        valid:'验证码不正确！'
                    },
                    message: `注册失败，参数不正确！`,
                    data: {}
                })
                return
            }
            db.collection('users').find({//判断是否重复
                $or: [
                    { account: account },
                    { phone: phone },
                    { email: email }
                ]
            }, function (err, result) {
                if (result.length > 0) {//判断哪个重复
                    result.map(k => {
                        if (k.account == account) error['account'] = "该账号已被注册";
                        if (k.phone == phone) error['phone'] = "该手机号码已被注册";
                        if (k.email == email) error['email'] = "该邮箱已被注册";
                    })
                    // res.statusCode = 500;
                    res.json({
                        code: 0, 	// 0代表失败
                        error,
                        message: `注册失败，参数不正确！`,
                        data: {}
                    })
                } else {
                    let passwd = crypto.createHash('md5').update(password).digest('hex');
                    let now = new Date()
                    db.collection('users').insert({ account, phone, email, password: passwd ,create_time: `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`}, function (err, result) {
                        res.statusCode = 200;
                        res.json({
                            code: 1, 	// 1代表成功
                            error,
                            message: `注册成功`,
                            data: result
                        })
                    })

                }
            })

        } else {
            res.statusCode = 200;
            res.json({
                code: 0,
                error,
                message: `注册失败，参数不正确！`,
                data: {}
            })
        }
    }

    //退出
    if(request == 'logout'){
        req.session.user = '';
        res.end("ok")
    }
})

//后台管理接口
router.post('/users/manager', (req, res, next) => {
    const { query, db, body } = req;
    const { request } = query;
    // 判断管理员是否登录
    if (req.session.user) {
        if (req.session.user.role != 0) {
            res.json({
                code: 0,
                error: {},
                message: "管理员未登录",
                data: {}
            })
            return
        }
    } else if (req.session.user.role != 1) {
        res.json({
            code: 0,
            error: {},
            message: "管理员未登录",
            data: {}
        })
        return
    } else {
        res.json({
            code: 0,
            error: {},
            message: "管理员未登录",
            data: {}
        })
        return
    }

    //添加用户接口
    if (request == 'adduser') {
        const { account, email, phone, password } = body;
        let error = {};
        //判断传参是否为空
        if (phone) {//判断手机格式是否正确
            if (!validator.isMobilePhone(phone, 'zh-CN')) error['phone'] = "手机格式不正确！"
        } else {
            error['phone'] = "手机格式不正确！";
        };
        if (email) {//判断邮箱格式是否正确
            if (!validator.isEmail(email)) error['email'] = "邮箱格式不正确！";
        } else {
            error['email'] = "邮箱格式不正确！";
        };
        if (!account) error['account'] = "当前账号不存在！";
        if (!password) error['password'] = "密码长度不正确！";

        if (Object.keys(error).length == 0) {
            db.collection('users').find({
                $or: [
                    { account: account },
                    { email: email },
                    { phone: phone }
                ]
            }, function (err, result) {
                if (result.length > 0) {//如果有重复,判断哪个重复
                    result.map(k => {
                        if (k.account == account) error['account'] = "该账号已存在";
                        if (k.phone == phone) error['phone'] = "该手机号码已存在";
                        if (k.email == email) error['email'] = "该邮箱已存在";
                    })
                    res.json({
                        code: 0,
                        error,
                        message: `添加失败，参数不正确！`,
                        data: {}
                    })
                    res.statusCode = 500;
                } else {//如果没有重复,插入数据
                    let passwd = crypto.createHash('md5').update(password).digest('hex');
                    let now = new Date();
                    // console.log(now.getDate())
                    db.collection('users').insert({ account, phone, email, password: passwd, create_time: `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}` }, function (err, result) {
                        res.statusCode = 200;
                        delete result.ops[0].password
                        res.json({
                            code: 1,
                            error,
                            message: `添加成功`,
                            data: result.ops[0]
                        })
                    })
                }
            })
        } else {
            res.statusCode = 200;
            res.json({
                code: 0,
                error,
                message: `添加失败，参数不正确！`,
                data: {}
            })
        }
    }

    //删除用户接口
    if (request == 'rmuser') {
        const { where } = body;
        let error = {};
        if (!where) error['where'] = "参数类型不正确!"

        if (Object.keys(error).length == 0) {
            db.collection('users').find(where, function (err, result) {
                if (result.length == 0) {
                    res.json({
                        code: 0,
                        error: {
                            where: "参数类型不正确!"
                        },
                        message: `删除失败,参数类型不正确！`,
                        data: {}
                    })
                    res.statusCode = 500;
                } else {
                    db.collection('users').remove(where, function (err, result) {
                        res.statusCode = 200;
                        res.json({
                            code: 1,
                            error,
                            message: `删除成功！`,
                            data: {}
                        })
                    })
                }
            })
        } else {
            res.statusCode = 200;
            res.json({
                code: 0,
                error,
                message: `删除失败,参数类型不正确！`,
                data: {}
            })

        }
    }

    //修改用户接口
    if (request == 'uptuser') {
        const { where, data } = body;
        let error = {};
        if (!where) error['where'] = "参数类型不正确!";
        if (!data) error['data'] = "参数类型不正确!";

        if (Object.keys(error).length == 0) {
            db.collection('users').find(where, function (err, result) {
                if (result.length == 0) {
                    res.json({
                        code: 0,
                        error: {
                            where: "参数类型不正确!"
                        },
                        message: "修改失败,参数类型不正确! ",
                        data: {}
                    })
                    res.statusCode = 500;
                } else {
                    db.collection('users').update(where, data, function (err, result) {
                        res.statusCode = 200;
                        res.json({
                            code: 1,
                            error,
                            message: "修改成功! ",
                            data: {}
                        })
                    })
                }
            })
        } else {
            res.statusCode = 200;
            res.json({
                code: 0,
                error,
                message: "修改失败,参数类型不正确! ",
                data: {}
            })
        }
    }

    //查询用户接口
    if (request == 'fduser') {
        const { where, limit, page, sort } = body;
        let error = {};
        if (!where) {
            where == {}
        };
        if (!limit) {
            limit == 100;
        } else if (limit < 0) {
            error['limit'] = "参数类型不正确!"
        } else if (!parseInt(limit) == Number) {//判断是不是整数
            error['limit'] = "参数类型不正确!"
        };
        if (!page) {
            page == 0;
        } else if (page < 0) {
            error['page'] = "参数类型不正确!"
        } else if (!parseInt(page) == Number) {
            error['page'] = "参数类型不正确!"
        };
        if (!sort) {
            sort == { _id: 1 }
        }

        if (Object.keys(error).length == 0) {
            db.collection('users')
                .sort(sort)
                .limit(limit)
                .skip(page)
                .find(where, function (err, result) {
                    if (result.length > 0) {
                        res.statusCode = 200
                        res.json({
                            code: 1,
                            error,
                            message: `查询成功！`,
                            data: result
                        })
                    } else {
                        res.json({
                            code: 0,
                            error,
                            message: `查询失败,参数类型不正确`,
                            data: {}
                        })
                        res.statusCode = 500;
                    }
                })
        } else {
            res.statusCode = 200;
            res.json({
                code: 0,
                error,
                message: `查询失败,参数类型不正确！`,
                data: {}
            })
        }

    }

})




//用户头像上传接口
router.post('/upload', (req, res, next) => {
    const { query, body, db } = req;
    const { request } = query;

    //用户头像上传接口
    if (request == 'avatar') {
        const { _id, email, phone, pic } = body;
        let error = {};
        //判断是否为空
        if (!req.files[0]) error['pic'] = "图片不存在!";
        if (!_id && !email && !phone) error['_id || email || phone'] = "用户信息错误";
        if (email) {
            if (!validator.isEmail(email)) error['email'] = "邮箱格式错误";
        }
        if (phone) {
            if (!validator.isMobilePhone(phone, 'zh-CN')) error['phone'] = "手机格式错误"
        }
        // 判断用户是否已登录
        if (!req.session.user) {
            res.json({
                code: 0,
                error: {},
                message: "用户未登录",
                data: {}
            });
            return;
        } else {
            console.log(req.session.user.email)
            console.log(email)
            if (_id) {
                if (req.session.user._id != _id) {
                    res.json({
                        code: 0,
                        error: {},
                        message: "用户未登录",
                        data: {}
                    });
                    return
                }
            }
            if (req.session.user.email != email) {
                console.log(10)
                res.json({
                    code: 0,
                    error: {},
                    message: "用户未登录",
                    data: {}
                });
                return
            }
            if (phone) {
                if (req.session.user.phone != phone) {
                    res.json({
                        code: 0,
                        error: {},
                        message: "用户未登录",
                        data: {}
                    });
                    return
                }
            }

        }


        if (Object.keys(error).length == 0) {
            let account = {};
            if (email) account['email'] = email;
            if (_id) account['_id'] = _id;
            if (phone) account['phone'] = phone;
            db.collection('users').find({
                $or: [
                    { _id: _id },
                    { email: email },
                    { phone: phone }
                ]
            }, function (err, result) {
                if (result == 0) {
                    res.statusCode = 500;
                    error['_id || email || phone'] = "用户信息错误";
                    res.json({
                        code: 0,
                        error,
                        message: "上传失败,参数不正确!",
                        data: {}
                    })
                } else {
                    let d = new Date().getTime()
                    let extname = path.extname(req.files[0].originalname)
                    let filename = crypto.createHash('md5').update(req.files[0].originalname + d).digest('hex') + extname
                    // fs writeFile 存储文件
                    let filepath = path.join(__dirname, '..', 'public', 'upload', filename)
                    fs.writeFile(filepath, req.files[0].buffer)
                    db.collection('users').update(account, { upic: `/upload/${filename}` }, function (err, result) {
                    })
                    res.statusCode = 200;
                    res.json({
                        code: 1,
                        error,
                        message: "上传成功",
                        data: {
                            uri: `/upload/${filename}`
                        }
                    })

                }
            })
        } else {
            res.statusCode = 200;
            res.json({
                code: 0,
                error,
                message: "上传失败,参数不正确!",
                data: {}
            })
        }
    }
})

//发送邮箱验证码
router.get('/reset', (req, res, next) => {
    const { query, db, body } = req;
    const { email, request } = query;
    let error = {};
    if (email) {
        if (!validator.isEmail(email)) {
            res.json({
                code: 0,
                error: {
                    email: "邮箱账号格式不正确!"
                },
                message: "邮箱验证码发送失败",
                data: {}
            })
            return
        }

        if (request == 'password') {
            db.collection('users').find({ email }, function (err, result) {
                if (result.length = 0) {
                    res.json({
                        code: 0,
                        error: {
                            email: "该邮箱未注册!"
                        },
                        message: "邮箱验证码发送失败",
                        data: {}
                    })
                } else {
                    function code(length) {
                        let code = "";
                        for (let i = 0; i < length; i++) {
                            code += Math.floor(Math.random() * 10)
                        }
                        return code;
                    }
                    req.session.emailCode = code(6);
                    // console.log(req.session.emailCode)
                    emailServer.send({
                        text: `您的验证码是${req.session.emailCode}!-test`,
                        from: 'miss_wangyamin@qq.com',
                        to: email,
                        subject: '账号注册验证'
                    }, function (err, message) {
                        res.json({
                            status: 1,
                            message: '发送成功',
                            data: []
                        })
                    })

                }
            })
        }

        if (request == 'register') {
            db.collection('users').find({ email }, function (err, result) {
                if (result.length > 0) {
                    res.json({
                        code: 0,
                        error: {
                            email: "该邮箱已注册!"
                        },
                        message: "邮箱验证码发送失败",
                        data: {}
                    })
                } else {
                    function code(length) {
                        let code = "";
                        for (let i = 0; i < length; i++) {
                            code += Math.floor(Math.random() * 10)
                        }
                        return code;
                    }
                    req.session.emailCode = code(6);
                    // console.log(req.session.emailCode)
                    emailServer.send({
                        text: `您的验证码是${req.session.emailCode}!-test`,
                        from: 'miss_wangyamin@qq.com',
                        to: email,
                        subject: '账号注册验证'
                    }, function (err, message) {
                        res.json({
                            status: 1,
                            message: '发送成功',
                            data: []
                        })
                    })

                }
            })
        }
    } else {
        res.json({
            code: 0,
            error: {
                email: "邮箱不能为空!"
            },
            message: "邮箱验证码发送失败",
            data: {}
        })
    }
})


/* GET users listing. */
router.get('/', function (req, res, next) {
    res.send('respond with a resource');
});

module.exports = router;
