//import fetch from 'node-fetch';
//import {toFile as QRCodeToFile} from 'qrcode'
import {appendFile} from 'fs/promises'
import {resolve as resolvePath} from 'path'
const APP_ID ='ca.bc.gov.BCWallet'
const SCREENS={
    ONBOARDING:{
        selector:'//android.view.ViewGroup/android.view.View[@text="BC Wallet"]'
    },
    ENTER_PIN: {
        selector: 'id=com.ariesbifold:id/EnterPin',
        FIELD_ENTER_PIN_SELECTOR: 'id=com.ariesbifold:id/EnterPin',
        FIELD_REENTER_PIN_SELECTOR: 'id=com.ariesbifold:id/ReenterPin',
        FIELD_CREATE_BUTTON_SELECTOR: 'id=com.ariesbifold:id/Create',
        FIELD_ENTER_BUTTON_SELECTOR: 'id=com.ariesbifold:id/Submit',
    },
    HOME: {
        selector: '//android.view.ViewGroup/android.view.View[@text="Home"]',
        button: '~Home'
    }
}

let invitation = null;
const runId = new Date().getTime()
describe('BCWallet - Demo', () => {
    before(async ()=>{
        //await browser.startRecordingScreen();
    })
    after(async ()=>{
        //await browser.saveRecordingScreen(`./videos/BCWallet-demo-${new Date().getTime()}.mp4`);
    })
//before(()=>{
/**
poster custom
size 1.5 1.5
position 0 0 -1.7
rotation 0.1 0 0
default custom.png
**/
//})
    const USER_XP_DELAY=2000;

    const waitForSelector = async (selector) => {
        console.log(`Waiting for Selector:\n  ${selector}`)
        let content2 = await browser.$(selector)
        return content2.waitForExist({ timeout: 5000000 }).then(()=>{
            console.log(`Found selector:\n  ${selector}`)
            return content2
        })
    }
    const waitForSelectorAndClick = async (selector:string, {delay}:{delay?:number}) => {
        const selectorElement = await waitForSelector(selector)
        if (delay) {
            await browser.pause(delay)
        }
        await selectorElement.click()
    }
    const userPause = async () => {
        return browser.pause(5000)
    }
    const scrollUntil = async (selector:string)=>{
        while(true){
            await browser.performActions([
              {
                  "type": "pointer",
                  "id": "finger1",
                  "parameters": { "pointerType": "touch" },
                  "actions": [
                    { "type": "pointerMove", "duration": 0, "x": 441, "y": 1765 },
                    { "type": "pointerDown", "button": 0 },
                    {
                      "type": "pointerMove",
                      "duration": 100,
                      "origin": "viewport",
                      "x": 441,
                      "y": 986
                    },
                    { "type": "pointerUp", "button": 0 }
                  ]
              }
            ])
            const continueBtn = await browser.$(selector)
            if (await continueBtn.isExisting()) {
                  return continueBtn
            }
          }
    }
    const step = async (scenario: string, step:string, fn: { (): Promise<void>; (): Promise<void>; (): any; })=>{
        await browser.startRecordingScreen();
        console.log(`starting scenario:${scenario} step: ${step}`)
        await fn()
        const fileRunPrefix = `BCWallet-demo-${runId}`
        const fileName = `${fileRunPrefix}-${scenario}-${step}.mp4`
        await appendFile(`./videos/${fileRunPrefix}.txt`, `${fileName}\n`)
        return browser.saveRecordingScreen(`./videos/${fileName}`)
        //return saveStepVideo('00','020');
    }
    it.only('Onboarding', async () => {
        const waitAndClick = async (selector) => {
            const nextEl = await waitForSelector(selector);
            return nextEl.click()
        }
        const waitAndClick2 = async (selector, monitorSelector) => {
            let content2 = await waitForSelector(monitorSelector)
            const prevTitle = await content2.getText()
            //console.log(`resourceId: ${await content1.getAttribute('resourceId')}`)
            const nextEl = await waitAndClick(selector);
            content2 = await waitForSelector(monitorSelector)
            while(true){
                const newTitle = await content2.getText()
                if (prevTitle !== newTitle){
                    break;
                }
            }
            await browser.pause(3000)
            return nextEl
        }
        const waitAndClickNext = async () => {
            return waitAndClick2('//android.widget.TextView[@text="Next"]', '//android.widget.HorizontalScrollView/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup/android.widget.TextView[1]');
        }
        await browser.execute("mobile: shell", {
            command: 'pm',
            args: ["clear", "ca.bc.gov.BCWallet"],
        });
        await step('00','010', async ()=>{
            await browser.launchApp()
            await waitForSelector(SCREENS.ONBOARDING.selector);
        })
        await step('00','020', async ()=>{
            await waitAndClickNext();
            await waitAndClickNext();
            await waitAndClickNext();
            await waitAndClick('//android.view.ViewGroup[@content-desc="Get Started"]/android.widget.TextView')
            await browser.pause(3000)
        })
        await step('00','030', async ()=>{
            const continueBtn = await scrollUntil('//android.view.ViewGroup[@content-desc="Continue"]/android.widget.TextView');
            await userPause();
            await (await waitForSelector('//android.view.ViewGroup[@content-desc="I Agree"]/android.widget.TextView')).click()
            await userPause();
            await continueBtn.click()
            await userPause();
        })
        await step('00','040', async ()=>{
            await (await waitForSelector(SCREENS.ENTER_PIN.FIELD_ENTER_PIN_SELECTOR)).setValue("123456");
            await (await waitForSelector(SCREENS.ENTER_PIN.FIELD_REENTER_PIN_SELECTOR)).setValue("123456");
            await (await waitForSelector(SCREENS.ENTER_PIN.FIELD_CREATE_BUTTON_SELECTOR)).click();
            await waitForSelector('//android.view.ViewGroup/android.widget.TextView[starts-with(@text,"Notifications")]')
            await userPause();
        })
        //Close/Reset App: adb shell pm clear "ca.bc.gov.BCWallet"
        //Terminate App adb shell am force-stop ca.bc.gov.BCWallet
        //Start App: adb shell am start -n ca.bc.gov.BCWallet/.MainActivity
    }).timeout(120000);
    async function obtainCredential(scenarioId, stepPrefix){
        const QRCode = await import("qrcode");
        const {default:fetch} = await import('node-fetch');
        const response = await fetch('http://localhost:8000/issuer/faber/connections/create-invitation', {method: 'POST', headers: {'Content-Type': 'application/json'}});
        invitation = (await response.json() as any)
        const invitation_url = invitation.invitation_url
        let credential =  null;
        await QRCode.toFile(resolvePath(process.env.ANDROID_SDK_ROOT, 'emulator/resources/custom.png'),  invitation_url, {scale: 8})
        await step(scenarioId,`${stepPrefix}00`, async () => {
            await (await waitForSelector('~Scan')).click();
            await browser.pause(5000);
            while(true){
                const [homeScreen, allowCameraBtn] = await Promise.all([browser.$(SCREENS.HOME.selector), browser.$('id=com.android.permissioncontroller:id/permission_allow_foreground_only_button')])
                if (await allowCameraBtn.isExisting()){
                    await allowCameraBtn.click()
                    await userPause();
                }else if (await homeScreen.isExisting()){
                    break
                }
            }
        })
        await step(scenarioId,`${stepPrefix}01`, async () => {
            await (await waitForSelector(SCREENS.HOME.button)).click();
            console.log('Offering Credential')
            credential = await (await fetch(`http://localhost:8000/issuer/faber/issue-credential/send-offer?${new URLSearchParams({schema_name:'degree schema', connection_id: invitation.connection_id}).toString()}`, {method: 'POST', headers: {'Content-Type': 'application/json'}})).json();
            await waitForSelector('//android.view.ViewGroup/android.widget.TextView[starts-with(@text,"Notifications")]')
            await waitForSelector('//android.view.ViewGroup/android.widget.TextView[starts-with(@text,"New Credential Offer")]')
            await waitForSelectorAndClick('//android.view.ViewGroup/android.widget.TextView[starts-with(@text,"View")]', {delay: USER_XP_DELAY})
            // android.widget.TextView
            const continueBtn = await scrollUntil('//android.widget.TextView[@text="Accept"]');
            await browser.pause(5000);
            await continueBtn.click()
            await waitForSelector('//android.widget.TextView[@text="Your credential is on the way"]')
            await browser.pause(3000);
        })
        await waitForSelector('//android.widget.TextView[@text="Credential added to your wallet"]')
        await step(scenarioId,`${stepPrefix}02`, async () => {
            await browser.pause(3000);
            await waitForSelectorAndClick('//android.widget.TextView[@text="Done"]', {delay: USER_XP_DELAY})
        })
        await step(scenarioId,`${stepPrefix}03`, async () => {
            await (await waitForSelector('//android.view.View[@text="Credentials"]')).click()
            await browser.pause(5000);
        })
        credential = await (await fetch(`http://localhost:8000/issuer/faber/issue-credential/records/${credential.credential_exchange_id}`, {method: 'GET', headers: {'Content-Type': 'application/json'}})).json();
        return credential
    }
    it('Obtain Credential', async () => {
        const SCENARIO_ID='01'
        await step(SCENARIO_ID,'010', async () => {
            await browser.launchApp()
            await waitForSelector(SCREENS.ENTER_PIN.selector)
            await (await waitForSelector(SCREENS.ENTER_PIN.FIELD_ENTER_PIN_SELECTOR)).setValue("123456");
            await (await waitForSelector(SCREENS.ENTER_PIN.FIELD_ENTER_BUTTON_SELECTOR)).click();
            await waitForSelector(SCREENS.HOME.selector)
            await browser.pause(5000);
        })
        await obtainCredential(SCENARIO_ID, '02')
    }).timeout(1200000)

    it('Present Non-Revocable Credential', async () => {
        const SCENARIO_ID='02'
        const {default:fetch} = await import('node-fetch');
        await browser.launchApp()
        await waitForSelector(SCREENS.ENTER_PIN.selector)
        await step(SCENARIO_ID,'0100', async () => {            
            await (await waitForSelector(SCREENS.ENTER_PIN.FIELD_ENTER_PIN_SELECTOR)).setValue("123456");
            await (await waitForSelector(SCREENS.ENTER_PIN.FIELD_ENTER_BUTTON_SELECTOR)).click();
            await waitForSelector(SCREENS.HOME.selector)
            await (await waitForSelector('~Home')).click();
        })
        await fetch(`http://localhost:8000/issuer/faber/present-proof/send-request?${new URLSearchParams({schema_name:'degree schema', connection_id: invitation.connection_id}).toString()}`, {method: 'POST', headers: {'Content-Type': 'application/json'}});
        await step(SCENARIO_ID,'0200', async () => {
            await waitForSelector('//android.view.ViewGroup/android.widget.TextView[starts-with(@text,"Notifications")]')
            await browser.pause(5000);
        })
        await waitForSelector('//android.view.ViewGroup/android.widget.TextView[starts-with(@text,"New Proof Request")]')
        await step(SCENARIO_ID,'0201', async () => {
            await userPause()
            await waitForSelectorAndClick('//android.view.ViewGroup/android.widget.TextView[starts-with(@text,"View")]', {delay: USER_XP_DELAY})
            const continueBtn = await scrollUntil('//android.widget.TextView[@text="Share"]');
            await browser.pause(5000);
            await continueBtn.click()
            await waitForSelector('//android.view.ViewGroup/android.widget.TextView[@text="Sending the information securely"]')
            await browser.pause(3000);
        })
        await waitForSelector('//android.widget.TextView[@text="Done"]')
        await step(SCENARIO_ID,'0202', async () => {
            await userPause()
            await waitForSelectorAndClick('//android.widget.TextView[@text="Done"]', {delay: USER_XP_DELAY})
            await userPause()
        })
        await step(SCENARIO_ID,'0300', async () => {
            await waitForSelector('//android.view.ViewGroup/android.widget.TextView[starts-with(@text,"Notifications")]')
            await userPause()
        })
    }).timeout(1200000)
    it.only('Present Revocable Credential', async () => {
        const SCENARIO_ID='03'
        let stp = 0
        let s2 = 0
        const {default:fetch} = await import('node-fetch');
        await browser.launchApp()
        await waitForSelector(SCREENS.ENTER_PIN.selector)
        await step(SCENARIO_ID,`${++stp}`.padStart(2, '0') + '00', async () => {            
            await (await waitForSelector(SCREENS.ENTER_PIN.FIELD_ENTER_PIN_SELECTOR)).setValue("123456");
            await (await waitForSelector(SCREENS.ENTER_PIN.FIELD_ENTER_BUTTON_SELECTOR)).click();
            await waitForSelector(SCREENS.HOME.selector)
            await (await waitForSelector(SCREENS.HOME.button)).click();
        })
        const cred = await obtainCredential(SCENARIO_ID, `${++stp}`.padStart(2, '0'))
        //console.log(cred)
        //const cred = {credential_exchange_id: '6b5cc6e8-67cc-4121-bd1c-d268b2a82223', connection_id:'85596b0a-4dac-449f-8f0c-928de7d79493', revoc_reg_id: 'W1YVdUx1UScYnAuNp2y4ZG:4:W1YVdUx1UScYnAuNp2y4ZG:3:CL:183216:faber.agent.degree_schema:CL_ACCUM:5b05b021-b5d3-4805-8f91-ddbbabb769fd', revocation_id:'3'}
        console.log(`credential_exchange_id:${cred.credential_exchange_id}`)
        console.log(`connection_id: ${cred.connection_id}`)
        console.log(`revoc_reg_id: ${cred.revoc_reg_id}`)
        console.log(`revocation_id: ${cred.revocation_id}`)
        
        await (await waitForSelector(SCREENS.HOME.button)).click();
        await fetch(`http://localhost:8000/issuer/faber/present-proof/send-request?${new URLSearchParams({schema_name:'degree schema', connection_id: cred.connection_id, non_revoked: 'true'}).toString()}`, {method: 'POST', headers: {'Content-Type': 'application/json'}});
        await step(SCENARIO_ID, `${++stp}`.padStart(2, '0') + '00', async () => {
            await waitForSelector('//android.view.ViewGroup/android.widget.TextView[starts-with(@text,"Notifications")]')
            await browser.pause(5000);
        })
        await waitForSelector('//android.view.ViewGroup/android.widget.TextView[starts-with(@text,"New Proof Request")]')
        await step(SCENARIO_ID,`${stp}`.padStart(2, '0') + '01', async () => {
            await userPause()
            await waitForSelectorAndClick('//android.view.ViewGroup/android.widget.TextView[starts-with(@text,"View")]', {delay: USER_XP_DELAY})
            const continueBtn = await scrollUntil('//android.widget.TextView[@text="Share"]');
            await browser.pause(5000);
            await continueBtn.click()
            await waitForSelector('//android.view.ViewGroup/android.widget.TextView[@text="Sending the information securely"]')
            await browser.pause(3000);
        })
        await waitForSelector('//android.widget.TextView[@text="Done"]')
        await step(SCENARIO_ID,`${stp}`.padStart(2, '0') + '02', async () => {
            await browser.pause(2000);
            await waitForSelectorAndClick('//android.widget.TextView[@text="Done"]', {delay: USER_XP_DELAY})
            await browser.pause(3000);
        })
        //}
        await step(SCENARIO_ID,`${stp}`.padStart(2, '0') + '03', async () => {
            await waitForSelector('//android.view.ViewGroup/android.widget.TextView[starts-with(@text,"Notifications")]')
            await userPause()
        })
        //Revoke credential
        console.log('Revoking Credential')
        await fetch(`http://localhost:8000/issuer/faber/revocation/revoke`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body:JSON.stringify({notify:true, publish: true, connection_id: cred.connection_id, rev_reg_id:cred.revoc_reg_id, cred_rev_id: cred.revocation_id, comment:'Revoked for some reason' })});
        // wait 10s
        await browser.pause(10000);
        await (await waitForSelector(SCREENS.HOME.button)).click();
        await fetch(`http://localhost:8000/issuer/faber/present-proof/send-request?${new URLSearchParams({schema_name:'degree schema', connection_id: cred.connection_id, non_revoked: 'true'}).toString()}`, {method: 'POST', headers: {'Content-Type': 'application/json'}});
        await step(SCENARIO_ID,`${++stp}`.padStart(2, '0') + '00', async () => {
            await waitForSelector('//android.view.ViewGroup/android.widget.TextView[starts-with(@text,"Notifications")]')
            await browser.pause(5000);
        })
        await waitForSelector('//android.view.ViewGroup/android.widget.TextView[starts-with(@text,"New Proof Request")]')
        await step(SCENARIO_ID,`${stp}`.padStart(2, '0') + '01', async () => {
            await userPause()
            await waitForSelectorAndClick('//android.view.ViewGroup/android.widget.TextView[starts-with(@text,"View")]', {delay: USER_XP_DELAY})
            const continueBtn = await scrollUntil('//android.widget.TextView[@text="Decline"]');
            await browser.pause(2000);
            await continueBtn.click()
            await waitForSelectorAndClick('id=android:id/button1', {delay: USER_XP_DELAY})
            await browser.pause(2000);
            await browser.pause(3000);
        })
        //if (revocationStatus !== 'Revoked') {
        await waitForSelector('//android.widget.TextView[@text="Done"]')
        await step(SCENARIO_ID,`${stp}`.padStart(2, '0') + '02', async () => {
            await browser.pause(2000);
            await waitForSelectorAndClick('//android.widget.TextView[@text="Done"]', {delay: USER_XP_DELAY})
            await browser.pause(3000);
        })
        //}
        await step(SCENARIO_ID,`${stp}`.padStart(2, '0') + '03', async () => {
            await waitForSelector('//android.view.ViewGroup/android.widget.TextView[starts-with(@text,"Notifications")]')
            await userPause()
        })
    }).timeout(1200000)
});



