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


/*****
   Dynamic Table Join Settings
  
   Use this to join ride results with 
     user submitted registration data such as privacy-agreement
     or gender, or age bracket, or assigned subgroup
*****/
var DATA_RESULTS_JOIN_COL="B12";
var DATA_JOIN_SHEETNAME_CELL="B13";
var DATA_JOIN_RANGE_CELL="B14";
var DATA_JOIN_COL1_NAME_CELL="B15";
var DATA_JOIN_COL1_COLUMN_CELL="B16";
var DATA_JOIN_COL2_NAME_CELL="B17";
var DATA_JOIN_COL2_COLUMN_CELL="B18";
var DATA_JOIN_COL3_NAME_CELL="B19";
var DATA_JOIN_COL3_COLUMN_CELL="B20";


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
 var dataSettings={}; 

 /* var dataSettings={
     results_join_col:cfg.getRange(DATA_RESULTS_JOIN_COL).getValue(),
     join_sheet_name:cfg.getRange(DATA_JOIN_SHEETNAME_CELL).getValue(),
     join_range:cfg.getRange(DATA_JOIN_RANGE_CELL).getValue(),
     col1_name:cfg.getRange(DATA_JOIN_COL1_NAME_CELL).getValue(),
     col1_column:cfg.getRange(DATA_JOIN_COL1_COLUMN_CELL).getValue(),
     col2_name:cfg.getRange(DATA_JOIN_COL2_NAME_CELL).getValue(),
     col2_column:cfg.getRange(DATA_JOIN_COL2_COLUMN_CELL).getValue(),
     col3_name:cfg.getRange(DATA_JOIN_COL3_NAME_CELL).getValue(),
     col3_column:cfg.getRange(DATA_JOIN_COL3_COLUMN_CELL).getValue()
  };
*/
  return { 
    "email":{
      "to": cfg.getRange(EMAIL_TO_CELL).getValue(),
      "bcc": cfg.getRange(EMAIL_BCC_CELL).getValue(),
      "cc": cfg.getRange(EMAIL_CC_CELL).getValue(),
      "subject": cfg.getRange(EMAIL_SUBJECT_CELL).getValue()
    },
    
    "dataSettings" :dataSettings,
    
    "peloton":{
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
