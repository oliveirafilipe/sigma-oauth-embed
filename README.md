# Requirements
1. Install python requirements `pip install -r requirements.txt`
2. Install node requirements `npm i`
3. Create a Service Principal at Databricks. Make sure it ahs permissions for the SQL Warehouse
4. Create a OAuth Connection at sigma and a workbook using this connection
5. Get an Embed Path for the workbook
6. Update the variables inside `index.js`
7. Run `node index.js`

### Expected Scenario
The embed loaded from the generated Embed URL will be able to load the data from the OAuth Connection

### Curent Scenario
Sigma shows an error `Invalid Databricks access token.`

<img src="https://github.com/user-attachments/assets/8a86c3f8-b4e6-4975-b47d-d9f87f176c7d" width=500>
