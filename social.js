/* Studyspace friends (Firebase). Loaded only when the Friends tab opens; the rest of the app works without it. */
(function(){
var CFG={apiKey:"AIzaSyBHlEqJ1S_TN8DDYKh9G6T5nV6XmplreK4",authDomain:"studyspace-dea66.firebaseapp.com",projectId:"studyspace-dea66",storageBucket:"studyspace-dea66.firebasestorage.app",messagingSenderId:"637848644816",appId:"1:637848644816:web:16b12c3e8c63973b6702d5"};
var B='https://www.gstatic.com/firebasejs/10.14.1/';
var st={ready:false,user:null,code:'',me:null,pairs:[],err:''};
var X=null,P={},unsubs=[],beat=null,studying=false,started=false;
var Social=window.Social={state:st};
function emit(){if(window.onSocial)window.onSocial()}
function iso(d){return d.toLocaleDateString('en-CA')}
function fail(e){st.err='Something went wrong ('+((e&&e.code)||'error')+').';emit()}
function pid(a,b){return a<b?a+'_'+b:b+'_'+a}
function nm(){return String((st.user&&st.user.displayName)||'Friend').split(' ')[0].slice(0,30)}
function D(){return X.F.doc.apply(null,[X.db].concat([].slice.call(arguments)))}
function stopPairs(){Object.keys(P).forEach(function(k){(P[k].w||[]).forEach(function(f){try{f()}catch(e){}})});P={}}
function teardown(){unsubs.forEach(function(f){try{f()}catch(e){}});unsubs=[];stopPairs();st.code='';st.me=null;st.pairs=[]}

Social.init=async function(){
  if(started)return;started=true;
  try{
    var A=await import(B+'firebase-app.js'),Au=await import(B+'firebase-auth.js'),F=await import(B+'firebase-firestore.js');
    var app=A.initializeApp(CFG);X={Au:Au,F:F,auth:Au.getAuth(app),db:F.getFirestore(app)};
    Au.onAuthStateChanged(X.auth,function(u){
      st.user=u;st.ready=true;st.err='';
      teardown();
      if(u)boot();else emit();
    });
  }catch(e){started=false;st.ready=true;st.err='Could not connect. Check your internet and try again.';emit()}
};
function mkCode(){
  var a=new Uint32Array(8);crypto.getRandomValues(a);
  var al='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',c='';
  for(var i=0;i<8;i++)c+=al[a[i]%al.length];
  return c;
}
async function boot(){
  var F=X.F,u=st.user;
  try{
    await F.setDoc(D('profiles',u.uid),{name:nm()},{merge:true});
    var d=await F.getDoc(D('users',u.uid)),code=d.exists()?d.data().code:'';
    for(var i=0;!code&&i<3;i++){
      var c=mkCode();
      try{await F.setDoc(D('codes',c),{uid:u.uid,name:nm()});await F.setDoc(D('users',u.uid),{code:c});code=c}catch(e){}
    }
    if(!code)throw new Error('code');
    st.code=code;
    unsubs.push(F.onSnapshot(D('profiles',u.uid),function(s){st.me=s.exists()?s.data():null;emit()},fail));
    unsubs.push(F.onSnapshot(F.query(F.collection(X.db,'friendships'),F.where('members','array-contains',u.uid)),onPairs,fail));
  }catch(e){fail(e)}
  emit();
}
function onPairs(q){
  var F=X.F,seen={};
  q.docs.forEach(function(d){
    var o=d.data(),other=o.members[0]===st.user.uid?o.members[1]:o.members[0],id=d.id;seen[id]=1;
    var p=P[id]||(P[id]={id:id,other:other,profile:null,ch:[]});
    p.status=o.status;p.by=o.by;p.name=(o.names&&o.names[other])||'Friend';
    if(o.status==='accepted'&&!p.w){
      p.w=[F.onSnapshot(D('profiles',other),function(s){p.profile=s.exists()?s.data():null;emit()},function(){}),
           F.onSnapshot(F.collection(X.db,'friendships',id,'challenges'),function(s){p.ch=s.docs.map(function(c){var v=c.data();v.id=c.id;return v});emit()},function(){})];
    }
  });
  Object.keys(P).forEach(function(id){if(!seen[id]){(P[id].w||[]).forEach(function(f){try{f()}catch(e){}});delete P[id]}});
  st.pairs=Object.keys(P).map(function(k){return P[k]});
  emit();
}
Social.signIn=async function(){
  if(!X)return;
  try{await X.Au.signInWithPopup(X.auth,new X.Au.GoogleAuthProvider())}
  catch(e){st.err=(e.code==='auth/popup-closed-by-user'||e.code==='auth/cancelled-popup-request')?'':'Sign-in failed ('+(e.code||'error')+').';emit()}
};
Social.signOut=async function(){Social.setStudying(false);try{await X.Au.signOut(X.auth)}catch(e){fail(e)}};
Social.addFriend=async function(code){
  code=String(code).trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(code===st.code){st.err='That is your own code.';emit();return}
  try{
    st.err='';
    var c=await X.F.getDoc(D('codes',code));
    if(!c.exists()){st.err='No one has that code. Check it and try again.';emit();return}
    var o=c.data(),me=st.user.uid,names={};names[me]=nm();names[o.uid]=o.name||'Friend';
    await X.F.setDoc(D('friendships',pid(me,o.uid)),{members:[me,o.uid],by:me,status:'pending',names:names});
    st.err='Request sent to '+(o.name||'your friend')+'. They need to accept it.';emit();
  }catch(e){st.err=(e.code==='permission-denied')?'You already have a request or friendship with this person. Check Requests below.':'Could not add ('+(e.code||'error')+').';emit()}
};
Social.accept=async function(id){try{await X.F.updateDoc(D('friendships',id),{status:'accepted'})}catch(e){fail(e)}};
Social.remove=async function(id){
  try{
    var p=P[id];
    if(p&&p.ch)for(var i=0;i<p.ch.length;i++)await X.F.deleteDoc(D('friendships',id,'challenges',p.ch[i].id));
    await X.F.deleteDoc(D('friendships',id));
  }catch(e){fail(e)}
};
Social.setStudying=function(on){
  if(on===studying)return;studying=on;
  clearInterval(beat);beat=null;
  if(!X||!st.user)return;
  var push=function(){X.F.setDoc(D('profiles',st.user.uid),{studying:studying,beat:Date.now()},{merge:true}).catch(function(){})};
  push();
  if(on)beat=setInterval(push,60000);
};
Social.addMinutes=function(m,day){
  if(!X||!st.user)return;
  var days={};days[day]=X.F.increment(m);
  X.F.setDoc(D('profiles',st.user.uid),{days:days},{merge:true}).catch(function(){});
};
Social.newChallenge=async function(id,title,hours,n){
  try{
    var s=new Date(),e=new Date();e.setDate(s.getDate()+n-1);
    await X.F.addDoc(X.F.collection(X.db,'friendships',id,'challenges'),{title:title.slice(0,50),target:Math.round(hours*60),start:iso(s),end:iso(e),by:st.user.uid});
  }catch(e2){fail(e2)}
};
Social.delChallenge=async function(id,cid){try{await X.F.deleteDoc(D('friendships',id,'challenges',cid))}catch(e){fail(e)}};
Social.isStudying=function(m){return !!(m&&m.studying)&&Date.now()-(m.beat||0)<150000};
})();
