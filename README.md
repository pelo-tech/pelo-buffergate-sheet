# pelo-buffergate-sheet
Sheet that captures form submissions and loads buffering classes for analysis

This goes along with the google sheet here: https://docs.google.com/spreadsheets/d/1LDiLxvKXJeYPkcCrOvP6Vfso1xy_Uat9X5tDOfsl8C0/edit?usp=sharing

Take a copy locally and make sure you copy and associate the google form it uses.

You will need to set up a trigger that calls 'onFormSubmit' when the Form is submitted.

You will also need to use the Peloton menu to log into the account you want to use, and supply e-mail addresses in the config slot (email yourself in the 'to' and the 'cc/bcc' so that if they supply an email they over-ride the 'to').. 

## Other Things you can do  
You can Load Users via the Peloton User Search. (See Peloton menu in google sheets).

Once you get a user, you can view their details, and 'Load' or 'Purge' their data directly from the sheet. NOTE these users will not have a country associated with them on any map function unless you enter some details manually for them on the Registration Tab.
