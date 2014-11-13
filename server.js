"use strict";
var md5 = require("MD5");
var express = require( "express" );
var http    = require( "http" );
var https   = require( "https" );
var app     = express();

app.use( express.static( __dirname ) );
app.set( "view engine", "ejs" );
app.set( "views", __dirname );

var serveIndex = function ( req, res, next )
{
    res.render( "index", {
        STATIC_PATH: process.env.STATIC_PATH || "/"
    } );
};

var serveFeed = function ( req, res, next )
{
    var apiScheme  = process.env.API_SCHEME  || "https";
    var apiDomain  = process.env.API_DOMAIN  || "";
    var apiPort    = process.env.API_PORT    || (apiScheme == "https" ? 443 : 80);
    var apiToken   = process.env.API_TOKEN   || "";
    var pairPrefix = process.env.PAIR_PREFIX || "";

    var host   = apiDomain;
    var port   = apiPort;
    var path   = "/api/user/feed?access_token=" + apiToken;
    var client = apiScheme == "https" ? https : http;

    if( process.env.HTTP_PROXY )
    {
        var proxy = process.env.HTTP_PROXY.replace('http://', '');

        host = proxy.split(':')[0];
        port = proxy.split(':')[1] || 80;
        path = apiScheme + "://" + apiDomain + ":" + apiPort + path;
    }

    var req = client.get(
    {
        "host": host,
        "port": port,
        "path": path
    }, function (result)
    {
        var body = "";

        result.on( "data", function( chunk )
        {
            body += chunk;

        } ).on( "end", function( )
        {
            var feed = JSON.parse(body);
            for (var i = 0; i < feed.length; ++i) {
                feed[i].gravatars = extractGravatars(feed[i].author, pairPrefix);
            }
            res.send(feed);

        } );
    } );

    req.on( "error", function( e )
    {
        console.log( "ERROR: " + e.message );
    } );
};

app.route( "/api/feed" ).get( serveFeed );
app.route( "*" ).get( serveIndex );

http.createServer( app ).listen( process.env.PORT || 3000 );

function extractGravatars( author, pairPrefix ) {
    var gravatars = [];
    if( pairPrefix.length > 0 && author.search(pairPrefix) == 0 ) {
        var parts  = author.split( '@' );
        var people = parts[0].split( '+' );

        for (var j = 1; j < people.length; ++j) {
            var email = people[j] + '@' + parts[1];
            gravatars.push( md5( email ) );
        }
    }
    else {
        gravatars.push( md5(author) );
    }
    return gravatars;
}
