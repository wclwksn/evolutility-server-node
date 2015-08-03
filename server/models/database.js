var pg = require('pg');
var path = require('path');
var _ = require('underscore');

var uims={
    //-- apps
    'todo': require('../../client/public/ui-models/apps/todo.js'),
    'contact': require('../../client/public/ui-models/apps/contacts.js'),
    'winecellar': require('../../client/public/ui-models/apps/winecellar.js'),
    'comics': require('../../client/public/ui-models/apps/comics.js'),
    //'test': require('../../client/public/ui-models/apps/test.js'),

    'todo_data': require('../../client/public/ui-models/apps/todo.data.js'),
    'contact_data': require('../../client/public/ui-models/apps/contacts.data.js'),
    'winecellar_data': require('../../client/public/ui-models/apps/winecellar.data.js'),
    'comics_data': require('../../client/public/ui-models/apps/comics.data.js')
};


var connectionString = require(path.join(__dirname, '../', '../', 'config'));

var client = new pg.Client(connectionString);
client.connect();

function getFields(uiModel, asObject){
    var fs=asObject?{}:[];
    function collectFields(te) {
        if (te && te.elements && te.elements.length > 0) {
            _.forEach(te.elements, function (te) {
                if(te.type!='panel-list'){
                    collectFields(te);
                }
            });
        } else {
            if(asObject){
                fs[te]=te;
            }else{
                fs.push(te);
            }
        }
    }
    collectFields(uiModel);
    return fs;
}

function uim2db(uimid){
    // -- generates SQL script to create a Postgress DB table for the ui model
    var uiModel = uims[uimid];
    var t=(uiModel.table || uiModel.id);
    var fields=getFields(uiModel);
    var sql='CREATE TABLE '+t+'\n(\n';
    sql+=' id serial NOT NULL,\n';
    _.forEach(fields, function(f, idx){
        sql+=' "'+(f.attribute || f.id)+'" ';
        switch(f.type){
            case 'boolean':
            case 'integer':
                sql+=f.type;
                break;
            case 'date':
            case 'datetime':
            case 'time': 
                sql+='date';
                break;
            default:
                sql+='text';
        }
        if(f.required){
        	sql+=' not null';
        }
        sql+=',\n';
    });
    sql+='CONSTRAINT "'+t+'_pkey" PRIMARY KEY (id)';
    sql+='\n) WITH (OIDS=FALSE);\n\n';

    // -- insert sample data
    _.each(uims[uimid+'_data'], function(row){
        sql+='INSERT INTO '+t;
        var ns=[], vs=[];
        for(var p in row){
            var v=row[p];
            if(!_.isArray(v)){
                ns.push('"'+p+'"');
                if(_.isString(v)){
                    v="'"+v.replace(/'/g, "''")+"'";
                }
                vs.push(v);
            }
        }
        sql+='('+ns.join(',')+') values('+vs.join(',')+');\n';
    });

    return sql+'\n';
}

var modelNames = ['todo', 'contact', 'winecellar', 'comics'];
var sql='';
_.forEach(modelNames, function(uimid){
    sql+=uim2db(uimid);
});
console.log(sql);
var query = client.query(sql);
query.on('end', function() { client.end(); });
