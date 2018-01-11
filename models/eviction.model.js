/**
 * Created by moclei on 5/30/17.
 */
//var evictions = require('../quickstart');

var Eviction = function (data) {
    this.data = data;
}

Eviction.prototype.getData = function () {
    return this.data;
}

Eviction.prototype.data = {}

Eviction.prototype.changeName = function (name) {
    this.data.name = name;
}

Eviction.findByName = function (id, callback) {

    var data = null;//evictions.loadEvictions();
    if(data){
        console.log("Eviction.findByName: " + data);
        callback(null, new Eviction(data));
    }
    else{
        console.log("No data!");
        return callback(err);
    }

  /*  evictions.getEvictions().run(function (err, data) {
        if (err) return callback(err);
        console.log("Eviction.findByName: " + data);
        callback(null, new Eviction(data));
    });*/
}

module.exports = Eviction;