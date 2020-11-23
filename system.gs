var SESSION_ID_CELL="B2";
var USERNAME_CELL="B4";
var USER_ID_CELL="B1";
var TIME_ZONE_CELL="B3";
var CUTOFF_DATE_CELL="B5";
var PELOTON_PLATFORM="web";
var PELOTON_API_BASE="https://api.onepeloton.com";
var CONFIG_SHEET_NAME="Config";
var RESULTS_SHEET_NAME="Results";
var EMAIL_TO_CELL="B6";
var EMAIL_CC_CELL="B7";
var EMAIL_BCC_CELL="B8";
var EMAIL_SUBJECT_CELL="B9";
var LOG_SHEET_NAME="System Log";
var REGISTRATION_SHEET_NAME="Registration";
var HARDWARE_MATCH_CELL="B10";


 

function testEventStart(){
eventStart("test","1,2,3,4");
}
function testEventEnd(){
eventEnd(1,4);
}

function eventStart(name, arguments){
Logger.log("EventStart: "+name+" /// "+arguments);
  logSheet=SpreadsheetApp.getActive().getSheetByName(LOG_SHEET_NAME);
  var id=1+ logSheet.getDataRange().getLastRow();
  var data=[[name,new Date(),arguments, null, null, null]];
  logSheet.getRange(id, 1,1, 6).setValues(data);
  return id;
}

function getDataAsObjects(sheet, range){
  if(!range || range==null) range=sheet.getDataRange();
  var rows=range.getValues();
  var result=[];
  if(rows.length>1){
    var fields=rows[0];
    for(var row=1; row<rows.length;++row){
      var obj={};
      for(var col=0; col<fields.length;++col){  
        obj[fields[col]]=rows[row][col];
      }
      // row number in google sheets (1-based)
      obj._row=1+row;
      result.push(obj);
    }
  } 
  return result;
}


function eventEnd(id, result){
  logSheet=SpreadsheetApp.getActive().getSheetByName(LOG_SHEET_NAME);
  var start=logSheet.getRange(id,2).getValue();
  var now=new Date();
  var duration=0;
  if(start) duration=now.getTime()-start.getTime();
  var data=[[result, new Date(), duration]];
  logSheet.getRange(id,4,1, 3).setValues(data);
  Logger.log("Event End: "+id+" /// "+result +" /// Duration: "+duration+"ms");
}

function processLogin(username, password){
      var sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG_SHEET_NAME);

    var ui = SpreadsheetApp.getUi(); // Same variations.
    var auth={
    "username_or_email": username,
    "password": password
    };
  
  var response=UrlFetchApp.fetch(
     getConfigDetails().peloton.http_base+"/auth/login",
     {'method':'POST','contentType': 'application/json', 'payload':JSON.stringify(auth)}
   );
                                
  var json = response.getContentText();
  var data = JSON.parse(json);
  sheet.getRange(SESSION_ID_CELL).setValue(data.session_id); 
  sheet.getRange(USER_ID_CELL).setValue(data.user_id); 
  sheet.getRange(USERNAME_CELL).setValue(username); 
  return data;
}

function promptForText(msg) {
  var ui = SpreadsheetApp.getUi(); 
  var result = ui.prompt(
    msg+":",
      ui.ButtonSet.OK_CANCEL);

  // Process the user's response.
  var button = result.getSelectedButton();
  if(button == ui.Button.CANCEL) return null;
  var text = result.getResponseText();
  return text;
}


function getConfigDetails(){
   var cfg = SpreadsheetApp.getActive().getSheetByName(CONFIG_SHEET_NAME);
   var session_id=cfg.getRange(SESSION_ID_CELL).getValue(); 
   var user_id=cfg.getRange(USER_ID_CELL).getValue(); 
   var tz=cfg.getRange(TIME_ZONE_CELL).getValue();
   var cutoff_date=cfg.getRange(CUTOFF_DATE_CELL).getValue();
   var harware_filter=cfg.getRange(HARDWARE_MATCH_CELL).getValue();
   var dataSettings={}; 


  return { 
    "email":{
      "to": cfg.getRange(EMAIL_TO_CELL).getValue(),
      "bcc": cfg.getRange(EMAIL_BCC_CELL).getValue(),
      "cc": cfg.getRange(EMAIL_CC_CELL).getValue(),
      "subject": cfg.getRange(EMAIL_SUBJECT_CELL).getValue()
    },
    
    "dataSettings" :dataSettings,
    
    "peloton":{
      "hardware_filter":harware_filter,
      "http_base":PELOTON_API_BASE,
      "session_id":session_id, 
      "user_id":user_id,
      "timezone":tz,
      "cutoff_date":cutoff_date,
      "http_options":
      {
        'headers':
        {
          'peloton-platform':PELOTON_PLATFORM, 
          'cookie':'peloton_session_id='+session_id
        }
      }
    }
  };
}
