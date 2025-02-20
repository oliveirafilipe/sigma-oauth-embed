const { DBSQLClient } = require('@databricks/sql');
const { spawn } = require('child_process');
const { randomUUID, createHmac } = require('node:crypto');

const ACCOUNT_ID = '<databricks_account_id>';
const ACCOUNT_ENDPOINT = `https://accounts.cloud.databricks.com/oidc/accounts/${ACCOUNT_ID}/v1/token`;
const DATABRICKS_CLIENT_ID = "<service_principal_oauth_client_id>"
const DATABRICKS_CLIENT_SECRET = "<service_principal_oauth_client_secret>"
const WAREHOUSE_HOSTNAME = "<SQL_WAREHOSUE_SERVER_HOSTNAME>";
const WAREHOUSE_HTTP_PATH = "<SQL_WAREHOSUE_HTTP_PATH>";

EMBED_PATH = '<sigma_embed_path>';
EMBED_SECRET = '<developer_access_secret_aka_embed_secret>';
CLIENT_ID = '<developer_access_client_id>';

main()

async function main() {
    const oauth_token = await getDatabricksToken();
    const ranSuccessfully = await executeStatementInWarehouse(oauth_token);
    if (!ranSuccessfully) {
        console.log("Won't generate embed link. There was an error while trying to execute SQL Statement")
        console.log("Exiting")
        return;
    } else {
        console.log("Sucessfully ran the SQL Stament. The table above is the result;\n\n")
    }

    const encryptedOAuthToken = await runPythonScript('encrypt.py', [oauth_token, EMBED_SECRET])
    
    const embedURL = generateEmbedURL(encryptedOAuthToken.trim())
    console.log(embedURL)
}

async function getDatabricksToken() {
    const data = new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'all-apis'
    });

    const response = await fetch(ACCOUNT_ENDPOINT, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${Buffer.from(`${DATABRICKS_CLIENT_ID}:${DATABRICKS_CLIENT_SECRET}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: data
    })
    const { access_token } = await response.json()
    return access_token
}

function generateEmbedURL(encryptedAuthToken) {
    // Source: https://help.sigmacomputing.com/docs/example-embed-api-and-url
    const nonce = randomUUID();
    let searchParams = `?:nonce=${nonce}`;

    // 6: Construct required search parameters
    searchParams += `&:client_id=${CLIENT_ID}`;
    searchParams += '&:session_length=600';
    searchParams += `&:time=${Math.floor(new Date().getTime() / 1000)}`;
    searchParams += '&:external_user_id=1';
    searchParams += '&:mode=userbacked';
    searchParams += '&:email=foo@example.com';
    searchParams += '&:account_type=embedUser';
    searchParams += '&:external_user_team=Embed%20Team';
    searchParams += `&:oauth_token=${encryptedAuthToken}`;

    // 7: Construct the URL with search parameters and generate a signature
    const URL_WITH_SEARCH_PARAMS = EMBED_PATH + searchParams;
    const SIGNATURE = createHmac('sha256', Buffer.from(EMBED_SECRET, 'utf8'))
        .update(Buffer.from(URL_WITH_SEARCH_PARAMS, 'utf8'))
        .digest('hex');
    const URL_TO_SEND = `${URL_WITH_SEARCH_PARAMS}&:signature=${SIGNATURE}`;
    return URL_TO_SEND
}

async function executeStatementInWarehouse(token) {
    try {
        const client = new DBSQLClient();

        const connection = await client.connect(
            options = {
                authType: 'access-token',
                token,
                host: WAREHOUSE_HOSTNAME,
                path: WAREHOUSE_HTTP_PATH
            })

        const session = await connection.openSession();

        const queryOperation = await session.executeStatement(
            statement = "SELECT 1",
            options = { runAsync: true });

        const result = await queryOperation.fetchAll();
        await queryOperation.close();

        console.table(result);

        await session.close();
        await connection.close();

        return true
    } catch (error) {
        console.log(error)
    }
    return false
}

// Function to run Python script, that Sigma Support Agent provided
function runPythonScript(scriptPath, args = []) {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [scriptPath, ...args]);

        let output = '';
        let error = '';

        // Collect data from stdout
        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        // Collect data from stderr
        pythonProcess.stderr.on('data', (data) => {
            error += data.toString();
        });

        // Handle process completion
        pythonProcess.on('close', (code) => {
            if (code === 0) {
                resolve(output); // Resolve with the output if successful
            } else {
                reject(new Error(`Python process exited with code ${code}: ${error}`));
            }
        });
    });
}


