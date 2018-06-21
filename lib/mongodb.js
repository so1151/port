//引入MongoDB模块,创建数据库链接
const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://127.0.0.1:27017';
/**
 * find
 * @param {Object} ops 传过来的参数
 */
function find(ops){
    //将对象解构
    let {dbname,collectionName,selector,callback} = ops;
    //判断callback,如果不是函数抛出错误
    if(typeof callback != 'function'){
        try {
            throw new Error(`callback is not defined`)
        } catch (error) {
            console.error(error)
        }
    }
    //连接到数据库
    MongoClient.connect(url,(err,client)=>{
        if(err) throw err; 
        //返回一个数据库实例
        let db = client.db(dbname);
        db.collection(collectionName).find(selector).toArray(function(){
             //将arguments混入callback回调函数中
             callback(...arguments);
             //查询之后 释放查询
             client.close();
        })
    })
}

/**
 * update
 * @param {Object} ops 
 */
function update(ops){
    //将传过来的对象解构
    let {dbname,collectionName,selector,data,options,callback} = ops;
    //先判断callback,如果不是函数,抛出错误(先判断在执行,优化性能)
    if(typeof callback != 'function'){
        try {
            throw new Error(`callback is not defined`)
        } catch (error) {
            console.error(error)
        }
    }
    //连接数据库
    MongoClient.connect(url,(err,client)=>{
        if(err) throw err;
        //数据库实例
        let db = client.db(dbname);
        //判断是否更新多条数据
       if(options.multi){
           db.collection(collectionName).updateMany(selector,{$set:data},options,function(){
               callback(...arguments);
               //释放查询
               client.close()
           })
           return
       }
       //更新一条数据
       db.collection(collectionName).update(selector,{$set:data},options,function(){
           callback(...arguments);
           client.close()
       })

    })
};

//构造函数
class Db{
    /**
     * 
     * @param {string} dbname 要连接的数据库名称
     */
    constructor(dbname){
        this.dbname = dbname;
    }
    /**
     * collection 连接到集合
     * @param {string} collectionName 集合名称
     */
    collection(collectionName){
        this.collectionName = collectionName;
        //将thisreturn出去
        return this;
    }
    /**
     * sort 排序查询
     * @param {Object} sort 
     */
    sort(sort){
        this._sort = sort;
        return this;
    }

    /**
     * limit 限定查询
     * @param {Number} limit 
     */
    limit(limit){
        this._limit = limit;
        return this;
    }

    /**
     * skip 跳过查询
     * @param {Number} skip 
     */
    skip(skip){
        this._skip = skip;
        return this;
    }

    /**
     * find 查询数据
     * @param {Object} selector 查询条件
     * @param {Function} callback 回调函数
     */
    find(selector,callback){
        let find = (selector,ops,callback)=>{
            //解构ops
            let {sort,skip,limit,dbname,collectionName} = ops;
            MongoClient.connect(url,(err,client)=>{
                if(err) throw err;

                if(limit && sort && skip){//如果同时使用这三个方法
                    client
                        .db(dbname)
                        .collection(collectionName)
                        .find(selector)
                        .limit(limit)
                        .sort(sort)
                        .skip(skip)
                        .toArray(function(){
                            callback(...arguments);
                            //查询之后 释放查询
                            client.close();
                        })
                }else if(limit && skip){//如果同时使用limit,skip两个方法
                    client
                        .db(dbname)
                        .collection(collectionName)
                        .find(selector)
                        .limit(limit)
                        .skip(skip)
                        .toArray(function(){
                            callback(...arguments);
                            client.close()
                        })
                }else if(limit && sort){//如果同时使用limit和sort两个方法
                    client
                        .db(dbname)
                        .collection(collectionName)
                        .find(selector)
                        .limit(limit)
                        .sort(sort)
                        .toArray(function(){
                            callback(...arguments);
                            client.close();
                        })
                }else if(sort && skip){//如果同时使用skip和sort两个方法
                    client 
                        .db(dbname)
                        .collection(collectionName)
                        .find(selector)
                        .sort(sort)
                        .skip(skip)
                        .toArray(function(){
                            callback(...arguments);
                            client.close();
                        })
                }else if(limit || skip || sort){//如果使用三种方法中的其中一种
                    let key = '';
                    let data = '';
                    //判断是sort || limit || skip
                    if(sort){
                        key = 'sort';
                        data = sort;
                    }else if(limit){
                        key = 'limit';
                        data = limit;
                    }else{
                        key = 'skip';
                        data = skip;
                    }
                    client
                        .db(dbname)
                        .collection(collectionName)
                        .find(selector)
                        [key](data)
                        .toArray(function(){
                            callback(...arguments);
                            client.close();
                        })
                }else if(!limit && !sort && !skip){//如果三种方法都不使用
                    client
                        .db(dbname)
                        .collection(collectionName)
                        .find(selector)
                        .toArray(function(){
                            callback(...arguments);
                            client.close()
                        })
                }
            })
        }
        //得到对象
        let ops = {
            sort:this._sort,
            skip:this._skip,
            limit:this._limit,
            dbname:this.dbname,
            collectionName:this.collectionName
        }
        //获取这些对象之后,清空对象,避免并发时候出现的问题
        this._sort = this._skip = this._limit =null;
        //调用这个函数
        find(selector,ops,callback)
    }
    
    /**
     * update 更新文档
     * @param {Object} selector 查询条件
     * @param {Object} data 更新的文档
     * @param {Object} options 选项
     * @param {Function} callback 回调函数
     */
    update(selector,data,options,callback){
        //传进来参数的长度
        let argLength = arguments.length;
        //如果传进来三个参数
        if(argLength == 3){
            //第三个参数options就是回调函数
            callback = options;
            options = {};
            //将参数变成对象传进去
            update({
                dbname:this.dbname,
                collectionName:this.collectionName,
                selector,
                data,
                options,
                callback
            })
            return 
        }
        //如果传进来四个参数,执行下面代码
        update({
            dbname:this.dbname,
            collectionName:this.collectionName,
            selector,
            data,
            options,
            callback
        })
    }

    /**
     * remove 删除数据
     * @param {Object} selector 查询条件
     * @param {Object} options 选项
     * @param {Function} callback 回调函数
     */
    remove(selector,options,callback){

        let remove = (selector,options,callback)=>{
            //传进来参数的长度
            let argLength = arguments.length;
            //建立连接
            MongoClient.connect(url,(err,client)=>{
                //如果传进来两个参数
                if(argLength == 2){
                    callback = options;
                    options = {};
                    //判断callback是不是函数,return之后,下面的代码不会执行
                    if(typeof callback != 'function'){
                        try {
                            throw new Error(`callback is not defined`)
                        } catch (error) {
                            console.error(error)
                        }
                    }
                    client
                        .db(this.dbname)
                        .collection(this.collectionName)
                        .remove(selector,options,callback);
                    client.close();
                }else{//如果传进来三个参数,执行下面代码
                    client
                        .db(this.dbname)
                        .collection(this.collectionName)
                        .remove(selector,options,callback);
                    client.close();
                }       
            })

        }
        //在这个函数里面调用remove方法,模拟异步,以免数据被替换
        remove(selector,options,callback)
    }

    /**
     * insert 插入数据
     * @param {Object} data 插入的数据
     * @param {Function} callback 回调函数
     */
    insert(data,callback){
        let insert = (data,callback)=>{
            //判断callback是不是函数
            if(typeof callback != 'function'){
                try {
                    throw new Error(`callback is not defined`)
                } catch (error) {
                    console.error(error)
                }
            }
            //建立连接
            MongoClient.connect(url,(err,client)=>{
                if(err) throw err;
                //判断data是不是数组
                if(Array.isArray(data)){
                    client
                        .db(this.dbname)
                        .collection(this.collectionName)
                        .insertMany(data,callback);
                    //释放查询
                    client.close();
                    return;
                }
                //如果data不是数组,执行下面代码
                client
                    .db(this.dbname)
                    .collection(this.collectionName)
                    .insert(data,callback);
                client.close()
                
            })
        }
        //调用insert方法
        insert(data,callback)
    }

    /**
     * max 查询最大值
     * @param {string} data 要查询的数据
     * @param {Function} callback 回调函数
     */
    max(data,callback){
        let max = (ops)=>{
            //解构对象
            let {dbname,collectionName,data,callback} = ops;
            //判断callback是不是function
            if(typeof callback != 'function'){
                try {
                    throw new Error(`callback is not defined`)
                } catch (error) {
                    console.error(error)
                }
            }
            //建立数据库连接
            MongoClient.connect(url,(err,client)=>{
                if(err) throw err;
                client
                    .db(dbname)
                    .collection(collectionName)
                    .aggregate([{$group:{_id:"",max:{$max:data}}}])
                    .toArray(function(){
                        callback(...arguments);
                        client.close()
                    })
                
            })
        }
        //以对象的形式传参
        let ops = {
            dbname:this.dbname,
            collectionName:this.collectionName,
            data,
            callback
        }
        //调用这个函数
        max(ops)
    }

    /**
     * min 最小值
     * @param {String} data 要查询的数据
     * @param {Function} callback 回调函数
     */
    min(data,callback){
        let min= (ops)=>{
            //解构对象
            let {dbname,collectionName,data,callback} = ops;
            //判断callback是不是函数
            if(typeof callback != 'function'){
                try {
                   throw new Error(`callbcak is not defined`) 
                } catch (error) {
                    console.error(error)
                }
            }
            //建立数据库连接
            MongoClient.connect(url,(err,client)=>{
                if(err) throw err;
                client
                    .db(dbname)
                    .collection(collectionName)
                    .aggregate([{$group:{_id:"",min:{$min:data}}}])
                    .toArray(function(){
                        callback(...arguments);
                        client.close()
                    })
            })
        }
        //以对象的形式传参
        let ops = {
            dbname:this.dbname,
            collectionName:this.collectionName,
            data,
            callback
        }
        //调用这个函数
        min(ops)
    }

    /**
     * avg 平均数
     * @param {String} data 要查询的数据
     * @param {Function} callback 回调函数
     */
    avg(data,callback){
        let avg = (ops)=>{
             //解构传过来的对象
             let {dbname,collectionName,data,callback} =ops;
            //判断callback是不是函数
            if(typeof callback != 'function'){
                try {
                    throw new Error(`callback is not defined`)
                } catch (error) {
                    console.error(error)
                }
            }
            //建立连接
            MongoClient.connect(url,(err,client)=>{
                if(err) throw err;
                client
                    .db(dbname)
                    .collection(collectionName)
                    .aggregate([{$group:{_id:"",avg:{$avg:data}}}])
                    .toArray(function(){
                        callback(...arguments)
                        client.close()
                    })
            })
        }
        let ops = {
            dbname:this.dbname,
            collectionName:this.collectionName,
            data,
            callback
        }
        avg(ops)
    }

    /**
     * sum 求和
     * @param {String} data 要查询的数据
     * @param {Function} callback 回调函数
     */
    sum(data,callback){
        let sum = (ops)=>{
            //解构传过来的对象
            let {dbname,collectionName,data,callback} = ops;
            //判断callback是不是函数
            if(typeof callback != 'function'){
                try {
                    throw new Error(`callback is not defined`)
                } catch (error) {
                    console.error(error)
                }
            }
            //连接数据库
            MongoClient.connect(url,(err,client)=>{
                if(err) throw err;
                client
                    .db(dbname)
                    .collection(collectionName)
                    .aggregate([{$group:{_id:"",sum:{$sum:data}}}])
                    .toArray(function(){
                        callback(...arguments);
                        client.close()
                    })
            })
        }
        let ops = {
            dbname:this.dbname,
            collectionName:this.collectionName,
            data,
            callback
        }
        sum(ops)
    }
}
//将Db模块暴露出去
module.exports = Db;