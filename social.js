/* Studyspace friends (Firebase). Loaded only when the Friends tab opens; the rest of the app works without it. */
(function(){
var CFG={apiKey:"AIzaSyBHlEqJ1S_TN8DDYKh9G6T5nV6XmplreK4",authDomain:"studyspace-dea66.firebaseapp.com",projectId:"studyspace-dea66",storageBucket:"studyspace-dea66.firebasestorage.app",messagingSenderId:"637848644816",appId:"1:637848644816:web:16b12c3e8c63973b6702d5"};
var B='https://www.gstatic.com/firebasejs/10.14.1/';
var st={ready:false,user:null,gid:null,group:null,members:[],challenges:[],err:''};
var X=null,unsubs=[],beat=null,studying=false,started=false;
var Social=window.Social={state:st};
function emit(){if(window.onSocial)window.onSocial()}
function iso(d){return d.toLocaleDateString('en-CA')}
function fail(e){st.err='Something went wrong ('+((e&&e.code)||'error')+').';emit()}
function unsub(){unsubs.forEach(function(f){try{f()}catch(e){}});unsubs=[]}
function nm(){return String((st.user&&st.user.displayName)||'Friend').split(' ')[0].slice(0,30)}
function mref(gid){return X.F.doc(X.db,'groups',gid,'members',st.user.uid)}

Social.init=async function(){
  if(started)return;started=true;
  try{
    var A=await import(B+'firebase-app.js'),Au=await import(B+'firebase-auth.js'),F=await import(B+'firebase-firestore.js');
    var app=A.initializeApp(CFG);X={Au:Au,F:F,auth:Au.getAuth(app),db:F.getFirestore(app)};
    Au.onAuthStateChanged(X.auth,function(u){
      st.user=u;st.ready=true;st.err='';
      if(u){loadUser()}else{unsub();st.gid=null;st.group=null;st.members=[];st.challenges=[];emit()}
    });
  }catch(e){started=false;st.ready=true;st.err='Could not connect. Check your internet and try again.';emit()}
};
async function loadUser(){
  try{var d=await X.F.getDoc(X.F.doc(X.db,'users',st.user.uid));var g=d.exists()?d.data().gid:null;if(g)watch(g)}catch(e){fail(e)}
  emit();
}
function watch(gid){
  var F=X.F;unsub();st.gid=gid;
  unsubs.push(F.onSnapshot(F.doc(X.db,'groups',gid),function(d){st.group=d.exists()?d.data():null;emit()},fail));
  unsubs.push(F.onSnapshot(F.collection(X.db,'groups',gid,'members'),function(q){st.members=q.docs.map(function(d){var o=d.data();o.id=d.id;return o});emit()},fail));
  unsubs.push(F.onSnapshot(F.collection(X.db,'groups',gid,'challenges'),function(q){st.challenges=q.docs.map(function(d){var o=d.data();o.id=d.id;return o});emit()},fail));
}
Social.signIn=async function(){
  if(!X)return;
  try{await X.Au.signInWithPopup(X.auth,new X.Au.GoogleAuthProvider())}
  catch(e){st.err=(e.code==='auth/popup-closed-by-user'||e.code==='auth/cancelled-popup-request')?'':'Sign-in failed ('+(e.code||'error')+').';emit()}
};
Social.signOut=async function(){Social.setStudying(false);try{await X.Au.signOut(X.auth)}catch(e){fail(e)}};
Social.createGroup=async function(name){
  try{
    var a=new Uint32Array(8);crypto.getRandomValues(a);
    var al='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',code='';
    for(var i=0;i<8;i++)code+=al[a[i]%al.length];
    await X.F.setDoc(X.F.doc(X.db,'groups',code),{name:name.slice(0,40),owner:st.user.uid,created:Date.now()});
    await Social.join(code);
  }catch(e){fail(e)}
};
Social.join=async function(code){
  code=String(code).trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  try{
    st.err='';
    await X.F.setDoc(mref(code),{name:nm(),studying:false,beat:0},{merge:true});
    await X.F.setDoc(X.F.doc(X.db,'users',st.user.uid),{gid:code});
    watch(code);
  }catch(e){st.err=(e.code==='permission-denied')?'That code was not found. Check it and try again.':'Could not join ('+(e.code||'error')+').';emit()}
};
Social.leave=async function(){
  try{
    Social.setStudying(false);
    var g=st.gid;unsub();st.gid=null;st.group=null;st.members=[];st.challenges=[];emit();
    await X.F.deleteDoc(mref(g));
    await X.F.setDoc(X.F.doc(X.db,'users',st.user.uid),{gid:null});
  }catch(e){fail(e)}
};
Social.setStudying=function(on){
  if(on===studying)return;studying=on;
  clearInterval(beat);beat=null;
  if(!X||!st.user||!st.gid)return;
  var push=function(){X.F.setDoc(mref(st.gid),{studying:studying,beat:Date.now()},{merge:true}).catch(function(){})};
  push();
  if(on)beat=setInterval(push,60000);
};
Social.addMinutes=function(m,day){
  if(!X||!st.user||!st.gid)return;
  var days={};days[day]=X.F.increment(m);
  X.F.setDoc(mref(st.gid),{days:days},{merge:true}).catch(function(){});
};
Social.newChallenge=async function(title,hours,n){
  try{
    var s=new Date(),e=new Date();e.setDate(s.getDate()+n-1);
    await X.F.addDoc(X.F.collection(X.db,'groups',st.gid,'challenges'),{title:title.slice(0,50),target:Math.round(hours*60),start:iso(s),end:iso(e),by:st.user.uid});
  }catch(e2){fail(e2)}
};
Social.delChallenge=async function(id){try{await X.F.deleteDoc(X.F.doc(X.db,'groups',st.gid,'challenges',id))}catch(e){fail(e)}};
Social.isStudying=function(m){return !!m.studying&&Date.now()-(m.beat||0)<150000};
})();
