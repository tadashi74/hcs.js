const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
})
const it = readline[Symbol.asyncIterator]();
const { Certificate } = require('crypto');
//const hcs = require('./src')
const hcs = require('hcs.js');

const example = async () => {
    console.log('학교 이름을 입력해주세요.');
    const schoolName = (await it.next()).value;
    const schools = await hcs.searchSchool(schoolName);
    if (schools.length === 0) {
        console.log('검색된 학교가 없습니다.');
        process.exit(0);
    }
    const school = schools[0];

    console.log('이름을 입력해주세요.');
    const name = (await it.next()).value;

    console.log('생년월일 6자리를 입력해주세요.');
    const birthday = (await it.next()).value;

    const login = await hcs.login(school.endpoint, school.schoolCode, name, birthday)
    if (!login.success) {
        console.log(`로그인에 실패했습니다. 입력하신 정보가 올바르신가요?`);
        process.exit(0);
    }

    if(login.stdntYn === 'N') {
        console.log('해당 계정은 선생님 계정이 아닙니다.\n자가진단 목록을 확인하시려면 선생님 계정으로 로그인해주세요.');
        process.exit(0);
    }

    if (login.agreementRequired) {
        console.log('개인정보 처리 방침 (https://hcs.eduro.go.kr/agreement) 에 동의하십니까? 동의하실 경우, 엔터를 눌러주세요.');
        await hcs.updateAgreement(school.endpoint, login.token);
    }

    const passwordExists = await hcs.passwordExists(school.endpoint, login.token)
    if (!passwordExists) {
        console.log('자가진단 시스템에 로그인할때 사용할 비밀번호 4자리를 설정합니다.');
        let password;
        while (true) {
            console.log('사용할 비밀번호를 입력한 후, 엔터를 눌러주세요.');
            password = (await it.next()).value;
            if (password.length !== 4 || password.replace(/[^\d]/g, '') === '') {
                console.log('비밀번호는 숫자 4자리만 허용됩니다.');
            } else break;
        }
        await hcs.registerPassword(school.endpoint, login.token, password);
    }

    let token // 비밀번호로 로그인하여 새로운 토큰을 받아옵니다.
    while (true) {
        console.log('비밀번호 4자리를 입력해주세요.');
        const password = (await it.next()).value;
        const secondLogin = await hcs.secondLogin(school.endpoint, login.token, password);
        if (secondLogin.success) {
            token = secondLogin.token;
            break;
        }
        if (secondLogin.message) {
            console.log(secondLogin.message);
            process.exit(0);
        }
        if (secondLogin.remainingMinutes) {
            console.log(`5회 이상 실패하여 ${secondLogin.remainingMinutes}분 후에 재시도가 가능합니다.`);
            continue
        }
        console.log('잘못된 비밀번호입니다. 5회 이상 실패시 5분 후에 재시도가 가능합니다.');
        console.log(`현재 ${secondLogin.failCount}번 실패하셨습니다.`);
    }
    const checkList = await hcs.selfCheckList(school.endpoint, token);
    //console.log(JSON.stringify(checkList,null,3))
   
    const result = [];
    for(let i in checkList.data['userInfo']) result.push(`ㅣ${i}번ㅣ${checkList['data']['userInfo'][i]}`);
    console.log(`${checkList.data.classInfo.grade} 학년 ${checkList.data.classInfo.class}반 자가진단 현황\n\n${result.join('\n')}`);
    process.exit(0);
}

example().then()