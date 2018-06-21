//封装好的MongoDB方法,改成express中间件模式
const Db = require('../lib/mongodb');

module.exports = (dbname)=>{
    return (req,res,next)=>{
        req.db = new Db(dbname)
        next()
    }
}