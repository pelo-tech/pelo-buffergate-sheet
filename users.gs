
function getUserProfile(username) {
  if(!username || username.length==0) return null;
  
  var config=getConfigDetails();
  var peloton=config.peloton;
  
  var url=peloton.http_base +'/api/user/'+username;
  var json= UrlFetchApp.fetch(url,peloton.http_options).getContentText();
  var data = JSON.parse(json);
    console.log(data);

  var profile={
    username:data.username,
    location: data.location,
    user_id: data.id,
    last_workout: data.last_workout_at,
    image_url:data.image_url,
    followers:data.total_followers,
    following:data.total_following,
    private:data.is_profile_private,
    rides: data.total_pedaling_metric_workouts,
    following_user: (data.relationship  && data.relationship.me_to_user =='following'),
    user_following_me: ( data.relationship  &&  data.relationship.user_to_me =='following'),
    relationship: data.relationship
  };
  console.log(profile);
  return profile;
}

function getUserOverview(user_id){
  var config=getConfigDetails();
  var peloton=config.peloton;
  
  var url=peloton.http_base +'/api/user/'+user_id+"/overview";
  var json= UrlFetchApp.fetch(url,peloton.http_options).getContentText();
  var data = JSON.parse(json);
  console.log(data);
  return data;
}

function followUser(user_id){ 
  return changeRelationship("follow", user_id);
}

function unfollowUser(user_id){
  return changeRelationship("unfollow", user_id);
}

function changeRelationship(action, user_id){
  var config=getConfigDetails();
  var peloton=config.peloton;
  console.log("Change Relationship: " + action+" --> "+user_id);
  var action={"action":action,"user_id":user_id};
  var url=peloton.http_base +'/api/user/change_relationship';
  var json=UrlFetchApp.fetch(url,{'headers':peloton.http_options.headers,'method':'POST','contentType': 'application/json', 'payload':JSON.stringify(action)});
  var data = JSON.parse(json);
  console.log(data);      
  return data;
}


function searchUsers(query){
  Logger.log("Query for users: "+query);
  var config=getConfigDetails();
  var peloton=config.peloton;
  if(query==null) return [];
  var event=eventStart("Search For Users",query);
  query=query.replace(/[^A-Za-z0-9_]/gi, "");
  var url=peloton.http_base +"/api/user/search?limit=40&user_query="+query;
  var json= UrlFetchApp.fetch(url,peloton.http_options).getContentText();
  var response = JSON.parse(json);
  if(response && response.data) {
    var results=response.data;
    eventEnd(event, results.length);
    return results;
  } else {
    Logger.log("Error: No valid response came back");
    eventEnd(event, -1);
    return [];
  }
}