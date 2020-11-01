function getWorkoutsRaw(user_id, page_number, limit, sort_by, joins){
  var config=getConfigDetails();
  var peloton=config.peloton;
  if(!sort_by) sort_by='created_at,-pk';
  if(!joins) joins="ride,ride.instructor";
  var event=eventStart("GetWorkoutsRaw",user_id+","+ page_number+","+limit+","+sort_by+","+joins);

  var url=peloton.http_base +'/api/user/'+user_id+"/workouts?sort_by="+sort_by+"&joins="+joins+"&limit="+limit+"&page="+page_number;
  var json= UrlFetchApp.fetch(url,peloton.http_options).getContentText();
  var result = JSON.parse(json);
  eventEnd(event, "pg "+result.page+"/"+result.page_count+" - "+result.total+" total records");
  return result;
}




function getWorkoutsPage(user_id, page_number, limit){
  var event=eventStart("GetWorkoutsPage",user_id+","+page_number+","+limit);

  var config=getConfigDetails();
  var peloton=config.peloton;
  var result=getWorkoutsRaw(user_id, page_number, limit);
  
  
    
  var page={
    workouts:[],
    page: result.page,
    page_count: result.page_count,
    limit: result.limit,
    total: result.total,
    sort_by: result.sort_by,
    show_next: result.show_next,
    show_previous: result.show_previous
  };
  
   result.data.map(workout => {
    page.workouts.push({
     id:workout.id,
     user_id: workout.user_id,
     start:workout.start_time * 1000,
     end: workout.end_time * 1000,
     discipline: workout.fitness_discipline,
     pr: workout.is_total_work_personal_record,
     instructor: (workout.ride.instructor)?workout.ride.instructor.name:"Unknown Instructor",
     title: workout.ride.title, 
     name: workout.name,
     duration:workout.ride.duration/60,
     ride:workout.ride.id,
     aired:workout.ride.original_air_time*1000,
     timezone:workout.timezone,
     platform:workout.platform,
     buffering:workout.total_video_buffering_seconds,
     bufferingv2:workout.v2_total_video_buffering_seconds,
     output: workout.total_work/1000,
     created:workout.created,
     device_created: workout.device_time_created_at
     });
     
     }); 

  
  Logger.log(page);
  eventEnd(event, "Page "+page.page+"/"+page.page_count+" Total:"+page.total);
  return page;
}

function testPopulateWorkoutsFromCutoff(){
 populateWorkoutsFromCutoff('b3f902e4b6c54777a73b61471ebed471','DovOps');
}

function testPurgeUserData(){
 purgeUserData('b3f902e4b6c54777a73b61471ebed471','DovOps');
}

function populateWorkoutsFromCutoff(user_id,username){
  var event=eventStart("PopulateWorkoutsFromCutoff",user_id+","+username);
  var results=loadWorkoutsFromCutoff(user_id,username);
  if(! results || !results.length) {
    eventEnd(event,"No workouts found");
    return;
    }

  purgeUserData(user_id,username);

  
  var sheet=SpreadsheetApp.getActive().getSheetByName(RESULTS_SHEET_NAME);
  var workouts=[];
  results.forEach(function(workout){
    workouts.push({
      id:workout.id,
      user_id:workout.user_id,
      ride_id: workout.ride,
      start:workout.start,
      title: workout.title,
      pr: workout.pr,
      instructor:workout.instructor,
      aired:workout.aired,
      duration:workout.duration,
      platform: workout.platform,
      timezone:workout.timezone,
      output:workout.output,
      buffering:workout.buffering,
      bufferingv2:workout.bufferingv2
    });
  });
  workouts=workouts.filter(workout=>{
    // Bufferring on bike or tread, greater than 1sec
    return  (workout.platform.indexOf("home_")==0) && 
    (workout.buffering>1 || workout.bufferingv2 > 1);
  });
  workouts=workouts.sort((a,b)=>{ return a.start-b.start ; });
  
  var cols=Object.keys(workouts[0]).sort();
  var rows=[];
  
  workouts.forEach(function(workout){
    var row=[];
    cols.forEach(col=>{row.push(workout[col]);});
    rows.push(row);
  });
  var lastRow=sheet.getDataRange().getLastRow();
  var firstRow=lastRow+1;
  if(lastRow==1) {
    rows.unshift(cols);
    firstRow=1;
   }
  
  sheet.getRange(firstRow,1,rows.length,cols.length).setValues(rows);
  eventEnd(event,workouts.length);
  return workouts;
}

function toUTC(str){
  return new Date(str).getTime();
}


function toDate(str){
  return new Date(str);
}

function purgeUserData(user_id, username){
  var event=eventStart("PurgeUserData",user_id+","+username);
  var sheet=SpreadsheetApp.getActive().getSheetByName(RESULTS_SHEET_NAME);
  var data=sheet.getDataRange().getValues();
  // row[13] is column N =[user id]
  var data1=data.filter(row=>{    return row[13]!=user_id;     }  );
  if(!data || !data.length || data1.length==data.length){
    eventEnd(event,0);
    return;
  }
  sheet.clear();
  sheet.getRange(1,1,data1.length,data1[0].length).setValues(data1);
  eventEnd(event,data1.length-data.length);
}

function loadWorkoutsFromCutoff(user_id, username){
  var config=getConfigDetails();
  var peloton=config.peloton;  
  var event=eventStart("LoadWorkoutsFromCutoff",user_id+","+username);
  var cutoff=new Date(config.peloton.cutoff_date).getTime();
  var all=[];
  var done=false;
  var page=0;
  var page_size=200;
  
  while(!done){
    var results=getWorkoutsPage(user_id, page, page_size);
    Logger.log("Loading page "+page+ "//"+results.workouts.length);
    var valid=results.workouts.filter(function(workout){  return workout.start > cutoff;});
    for(var i=0;i<valid.length;++i) all.push(valid[i]);
    Logger.log("Valid.length: "+valid.length+"//"+results.length);
    Logger.log("START TIME " +new Date(results.workouts[0].start)+ " CUTOFF "+new Date(cutoff));
    
    if(valid.length<results.workouts.length || !results.show_next ){
       Logger.log("We are past the cutoff. Stop loading data at "+ all.length+" total rows");
       done=true;
     }  else {
        Logger.log("Show Next :"+results.show_next+"; total pages "+results.page_count + ". So far, loaded "+all.length+" total rows");
         ++ page;
     }
     
  };  
 eventEnd(event,all.length);
 return all.sort((a,b)=>{return a.start-b.start;});
}