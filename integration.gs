function onOpen() {
   SpreadsheetApp.getUi()  
      .createMenu('Peloton')
      .addItem('Login', 'showSidebarLogin')
      .addItem('Find Users', 'showSidebarUsers')
      .addToUi();
}


function handleSidebarLogin(obj){
  var results={};
   if(!obj.username || obj.username.length < 5 ||
      !obj.password  || obj.password.length <5 ) {
     return {"error":"Username and password are both required"};
   } 
  var results=processLogin(obj.username,obj.password);
  // for reasons I don't understand, Google has a hard time serializing this remotely 
  // to HTML calling this via google.script.run, but this fixes the issue.
  //    o
  // -\/^\/-
  // Whatever!
  return  JSON.parse(JSON.stringify(results));
}

function showSidebarLogin() {
  var html = HtmlService.createHtmlOutputFromFile('login-sidebar.html')
      .setTitle('Peloton Login')
      .setWidth(320).setHeight(550);
      SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
      .showModalDialog(html, "Peloton Log In");
}

function reprocessUser(user_id,  username){
  var regSheet=SpreadsheetApp.getActive().getSheetByName(REGISTRATION_SHEET_NAME);
  
 var values=regSheet.getRange("A:A").getValues();
 var found=false;
 values.forEach(row =>{ if(row==user_id) found=true; });
 if(found){
   SpreadsheetApp.getUi().alert("Found registered user:"+username+". Reloading their workouts");
    var workouts=populateWorkoutsFromCutoff(user_id,username);
    SpreadsheetApp.getUi().alert("Reprocessed "+workouts.length+" workouts");
    return workouts.length;
  } else {
    SpreadsheetApp.getUi().alert("Cannot find user registration for  "+username+". Can only load for users who are already registered");
    return 0;
  }

}


function showSidebarUsers() {
  var tmpl = HtmlService.createTemplateFromFile('users-sidebar.html').evaluate();
  var html=HtmlService.createHtmlOutput().setContent(tmpl.getContent())
    .setTitle('Peloton User Search');
  SpreadsheetApp.getUi() 
      .showSidebar(html);
}

function sidebarSearchUsers(query){
  var event=eventStart("sidebar search usrs",query);

  var users=searchUsers(query);

  eventEnd(event,"");
  return JSON.parse(JSON.stringify(users));
}

function handleLoadWorkouts(user_id,username){
   SpreadsheetApp.getUi().alert("Loading user workouts. Results Tab will show you the results in a few seconds");
   populateWorkoutsFromCutoff(user_id,username);
}

function handlePurgeUserData(user_id,username){
   SpreadsheetApp.getUi().alert("Purged User's Results");
   purgeUserData(user_id,username);
}

function displayUser(id){
  var template=HtmlService.createTemplateFromFile("user-details.html");
  template.user_id=id;
  var output=template.evaluate();
  var html=HtmlService.createHtmlOutput().setContent(output.getContent()).setWidth(800).setHeight(800).setTitle("User Details");
  SpreadsheetApp.getUi().showModalDialog(html,"User Details");
  }
  
  
  
  function testSubmit(){
  var event={namedValues:{"Leaderboard Name":["DovOps"]}};
  onFormSubmit(event);
}

function onFormSubmit(event){
 
  Logger.log(JSON.stringify(event));
  Logger.log(event.namedValues);
  // Adding extra fields:
  event.namedValues["AlreadyFollowing"]=null;
  event.namedValues["UserID"]=null;
  // Empty column should be purged
  if(event.namedValues[""]) delete event.namedValues[""];
  
  var message="";
  var username=event.namedValues["Leaderboard Name"][0];
  var formEvent=eventStart("New Registration", username);
  var profile=null;
  
  if(username!=null){
     Logger.log("Scrubbing username:"+username);
     username=username.replace(/[^A-Za-z0-9_]/gi, "");
     Logger.log("Scrubbed username:"+username);
     }
  var workouts=null;
  var progress=["Form submitted for user "+username];
  // Retrieve User Profile
  try{
      profile=getUserProfile(username);
      if(profile) username=profile.username;
      var status="Success Loading";
      message="Successfully Loaded User Profile: "+profile.username +" ("+profile.user_id+")";
      progress.push("Profile " +profile.username +" ("+profile.user_id+") loaded.");
      // Reassign corrected username
      event.namedValues["Leaderboard Name"]=[profile.username];
      event.namedValues["UserID"]=[profile.user_id];
      event.namedValues["AlreadyFollowing"]=[profile.following_user];
      
      // Check if Following the user, otherwise Follow
      if(profile.following_user || !profile.private){
        if(profile.private) progress.push("Already following this user");
        else progress.push("Profile is public. Data can be loaded");
        message+=" (Already Following this user)";
        status="OK";
        Logger.log("Already Following or Public");
        
         try{
          // Loading workout data
          workouts=populateWorkoutsFromCutoff(profile.user_id,profile.username);
          progress.push("Loaded "+workouts.length+" buffering workouts since "+getConfigDetails().peloton.cutoff_date);
        } catch(e){
          progress.push("ERROR loading workout details for user");
        }
  
      } else if(profile.private) {
        // Try Following
        try{
            progress.push("Attempting to follow-request user in order to get access to the workout list.");
            var result=changeRelationship("follow",profile.user_id);
            message +=" Relationship Changed: me to user:"+result.me_to_user +", user to me:"+result.user_to_me;
            status = "Requested to follow: "+result.me_to_user;
            event.namedValues["AlreadyFollowing"]=[result.me_to_user];
            progress.push("Profile is private. Status "+result.me_to_user+".  Please re-submit this form after accepting the follow request");
         }  catch (x){
           event.namedValues["AlreadyFollowing"]=["Error Following"];
           progress.push("Error while trying to follow this user. Please re-try submitting the. Form");
           status="Error Following User";
           Logger.log("Error Following "+JSON.stringify(x));
           message+="Error Following user "+username+": "+JSON.stringify(x);
        }
      }
     
     
    } catch (x){
    status="No User Found";
    progress.push("ERROR: No profile found for '"+username+"'. Please resubmit with a valid leaderboard name");
    Logger.log("Error Loading Profile "+JSON.stringify(x));
    message+="| Error resolving user profile "+username+": "+JSON.stringify(x);
  }    
  
  
  var cfg=getConfigDetails();
  var to=cfg.email.to;
  var emailField="Email Address";
  if(event.namedValues[emailField] && event.namedValues[emailField][0]){
    to=event.namedValues[emailField][0];
    progress.push("Per user request, sending send e-mail to :"+to);
  }
  
  
  Logger.log("progress:" +JSON.stringify(progress));
  var formValues = event.namedValues;
  var html = '<hr>'+message+'<hr><h4>System Log</h4><ul>';
  progress.forEach(line=>{html+="<li>"+line+"</li>";});
  html+="</ul><hr><h3>Form Details</h3><ul>";
  for (Key in formValues) {
    var key = Key;
    var data = formValues[Key];
    html += '<li>' + key + ": " + data + '</li>';
  };
  html += '</ul>';
  
  if(workouts!=null && workouts.length>0){
    html+="<hr><h3>Buffering Workouts</h3><table border='1' cellspacing='0' cellpadding='3'>";
    html+="<tr><th>Date</th><th>Title</th><th>Instructor</th><th>Duration(min)</th><th>Class Date</th><th>Timezone</th><th>Buffering(sec)</th><th>Output</th><th>PR</th><th>Platform</th><th>Links</th></tr>";
    workouts.forEach(workout=>{
      html+="<tr>";
        html+="<td>"+Utilities.formatDate(new Date(workout.start),workout.timezone,"yyyy-MM-dd'T'HH:mm:ss'Z'")+"</td>";
        html+="<td>"+workout.title+"</td>";
        html+="<td>"+workout.instructor+"</td>";
        html+="<td align='center'>"+workout.duration+"</td>";
        html+="<td>"+Utilities.formatDate(new Date(workout.aired),workout.timezone,"yyyy-MM-dd'T'HH:mm:ss'Z'")+"</td>";
        html+="<td>"+workout.timezone+"</td>";
        html+="<td align='center'>"+workout.buffering+"</td>";
        html+="<td>"+Utilities.formatString("%.0f",workout.output)+"</td>";
        html+="<td align='center'>"+workout.pr+"</td>";
        html+="<td>"+workout.platform+"</td>";
        html+='<td><a href="https://members.onepeloton.com/classes/cycling?utm_source=ios_app&utm_medium=in_app&modal=classDetailsModal&classId='+workout.ride_id+'">Class</a> | ';
        html+='<a href="https://members.onepeloton.com/profile/workouts/'+workout.id+'?utm_source=ios_app&utm_medium=in_app&locale=en-US">Workout</a> </td>';
        
      html+="</tr>";
    });
    html+="</table>";
    

  }
  
  // Copy userID to first alphabetical column for VLOOKUPS
  formValues["AA_user_id"]=formValues["UserID"];

 
  var options={htmlBody:html};
  if(cfg.email.cc) options.cc=cfg.email.cc;
  if(cfg.email.bcc) options.bcc=cfg.email.bcc;
  var subject=cfg.email.subject;
  if(!subject) subject="Peloton Google Form Signup";
  
  
  GmailApp.sendEmail(to, subject+" ["+username+" : "+status+"]","",options);
  regSheet=SpreadsheetApp.getActive().getSheetByName(REGISTRATION_SHEET_NAME);
  var data=[];
  var keys=Object.keys(formValues).sort();

  // Inserting objects into Registration Table


  for(var i=0;i<keys.length;++i){
    data.push((formValues[keys[i]]+"").trim());
  }
  
  var id=regSheet.getDataRange().getLastRow();
  var rows=[];
  
  var columns=keys;

  
  if(id==1) rows.push(columns);
  rows.push(data);
  Logger.log(JSON.stringify(rows));
  regSheet.getRange(id==1?1:id+1,1,rows.length,columns.length).setValues(rows);
  eventEnd(formEvent, username+":"+status);
}