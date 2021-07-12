const socket = io();
const videoGrid = document.getElementById('video-grid');
const myVideo = document.createElement('video');
myVideo.muted = true;
let myUserId = "";
let chatOpen = true;
let participantsOpen = false;
let handRaised = false;


var peer = new Peer(undefined, { // id -> undefined
  path: '/peerjs',
  host: '/',
  port: '7000'
});

let myVideoStream;
navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
})
.then(stream => {
  myVideoStream = stream;
  addVideoStream(myVideo, stream);

  peer.on('call', call => {
    call.answer(stream);
    const video = document.createElement('video');
    call.on('stream', userVideoStream => {
      addVideoStream(video, userVideoStream);
    });
  });

  socket.on('user-connected', data => {
    socket.emit('participant-add', {toUserId: data.userId, fromUserId: myUserId, fromUserName: USER_NAME});
    console.log(`connected ${data.userId}`);
    connectToNewUser(data.userId, stream);
    addToParticipantList(data.userId, data.username);
    let username = data.username;
    let userId = data.userId;
    let rh = document.createElement('div');
    rh.innerHTML = `<div class="alert bg-dark-alert">${username} joined</div>`;
    rh.id = userId + 'join';
    rh.className = 'rh';
    document.getElementsByTagName('body')[0].appendChild(rh);
    $(`#${userId}join`).fadeTo(2000, 0);
    setTimeout(function(){
      $(`#${userId}join`).remove();
    }, 2000);
    // document.getElementById('v_' + data.userId).getElementsByClassName('text-block')[0].innerHTML = data.username;
  });

  socket.on('participant-add', data => {
    console.log(myUserId, data.toUserId);
    if (myUserId == data.toUserId) {
      addToParticipantList(data.fromUserId, data.fromUserName);
      // document.getElementById('v_' + data.fromUserId).getElementsByClassName('text-block')[0].innerHTML = data.fromUserName;
    }
  });

  let text = $('#chat_message');

  $('html').keydown(event => {
    if (event.which == 13 && text.val().length != 0) {
      socket.emit('message', { message: text.val(), username: USER_NAME, userId: myUserId });
      text.val('');
    }
  });

  socket.on('create-message', data => {
    let today = new Date();
    let time = today.getHours() + ':' + (today.getMinutes() >= 10 ? today.getMinutes() : '0' + today.getMinutes());
    if (data.userId == myUserId)
      $('.messages').append(`<li class="message"><p><b>You</b>  <span class="time">${time}</span><br/>${data.message}</p></li>`);
    else
      $('.messages').append(`<li class="message"><p><b>${data.username}  <span class="time">${time}</span></b><br/>${data.message}</p></li>`);
    scrolltoBottom();
  });

  socket.on('user-disconnected', data => {
    removeParticipant(data.userId);
    let username = data.username;
    let userId = data.userId;
    let rh = document.createElement('div');
    rh.innerHTML = `<div class="alert bg-dark-alert">${username} left</div>`;
    rh.id = userId + 'join';
    rh.className = 'rh';
    document.getElementsByTagName('body')[0].appendChild(rh);
    $(`#${userId}join`).fadeTo(2000, 0);
    setTimeout(function(){
      $(`#${userId}join`).remove();
    }, 2000);
  });

  socket.on('hand-raised', data => {
    if (data.userId !== myUserId)
      raiseHand(data.userId, data.username);
    else 
      raiseHand("my_participant", data.username + " (You)");
  });

  socket.on('hand-lowered', data => {
    if (data.userId !== myUserId)
      lowerHand(data.userId, data.username);
    else 
      lowerHand("my_participant", data.username + " (You)");
  });
})
.catch(() => {
  myVideoStream = null;
  alert('here');
});

peer.on('open', id => {
  myUserId = id;
  socket.emit('join-room', ROOM_ID, id, USER_NAME);
});

const connectToNewUser = (userId, stream) => {
  const call = peer.call(userId, stream);
  const video = document.createElement('video');
  call.on('stream', userVideoStream => {
    addVideoStream(video, userVideoStream, userId)
  });
}

const addVideoStream = (video, stream, userId) => {
  video.srcObject = stream;
  video.addEventListener('loadedmetadata', () => {
    video.play();
  });
  video.id = 'v_' + userId;
  let videoRows = videoGrid.getElementsByClassName('video-row');
  let numRows = videoGrid.getElementsByClassName('video-row').length;
  if (videoRows == undefined || numRows == 0 || videoRows[numRows - 1].getElementsByTagName('video').length == 3) {
    var videoRow = document.createElement('div');
    videoRow.className = 'video-row';
    videoRow.append(video);
    videoGrid.append(videoRow);
  } else {
    videoRows[numRows - 1].append(video);
  }
}

const scrolltoBottom = () => {
  let chat_window = $('.main_chat_window');
  chat_window.scrollTop(chat_window.prop('scrollHeight'));
}

const muteUnmute = () => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    setUnmuteButton();
  } else {
    myVideoStream.getAudioTracks()[0].enabled = true;
    setMuteButton();
  }
}

const setMuteButton = () => {
  const html = `
    <i class="fas fa-microphone" id="micButton"></i>
  `
  document.querySelector('.main_mute_button').innerHTML = html;
  document.getElementById("micButton").addEventListener("click", muteUnmute);
}

const setUnmuteButton = () => {
  const html = `
    <i class="unmute fas fa-microphone-slash" id="micButton"></i>
  `
  document.querySelector('.main_mute_button').innerHTML = html;
  document.getElementById("micButton").addEventListener("click", muteUnmute);
}

const playStop = () => {
  let enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    setPlayVideo();
  } else {
    myVideoStream.getVideoTracks()[0].enabled = true;
    setStopVideo();
  }
}

const setStopVideo = () => {
  const html = `
    <i class="fas fa-video" id="videoButton"></i>
  `;
  document.querySelector('.main_video_button').innerHTML = html;
document.getElementById("videoButton").addEventListener("click", playStop);
}

const setPlayVideo = () => {
  const html = `
    <i class="stop fas fa-video-slash" id="videoButton"></i>
  `;
  document.querySelector('.main_video_button').innerHTML = html;
document.getElementById("videoButton").addEventListener("click", playStop);
}

const openCloseChats = () => {
  if (chatOpen) {
    closeChat();
  } else {
    closeParticipants();
    participantsOpen = false;
    openChat();
  }
  chatOpen = !chatOpen;
}

const openCloseParticipants = () => {
  if (participantsOpen) {
    closeParticipants();
  } else {
    closeChat();
    chatOpen = false;
    openParticipants();
  }
  participantsOpen = !participantsOpen;
}

const openParticipants = () => {
  let left = document.getElementsByClassName('main_left')[0];
  let right = document.getElementById('main_right_participants');
  right.style.flex = '0.2';
  right.style.display = 'initial';
  left.style.flex = '0.8';
  document.getElementById('participantsButton').style.color = 'white';
}

const closeParticipants = () => {
  let left = document.getElementsByClassName('main_left')[0];
  let right = document.getElementById('main_right_participants');
  right.style.flex = '0';
  right.style.display = 'none';
  left.style.flex = '1';
  document.getElementById('participantsButton').style.color = 'black';
}

const openChat = () => {
  let left = document.getElementsByClassName('main_left')[0];
  let right = document.getElementById('main_right_chat');
  right.style.flex = '0.2';
  right.style.display = '';
  left.style.flex = '0.8';
  document.getElementById('chatButton').style.color = 'white';
}

const closeChat = () => {
  let left = document.getElementsByClassName('main_left')[0];
  let right = document.getElementById('main_right_chat');
  right.style.flex = '0';
  right.style.display = 'none';
  left.style.flex = '1';
  document.getElementById('chatButton').style.color = 'black';
}

const addToParticipantList = (userId, username) => {
  console.log(username);
  $('.participants').append(`<li class="message" id="p_${userId}"><i style="font-size:14px;" class='fas fa-user-alt'></i> ${username}</li>`);
}

const removeParticipant = (userId) => {
  try{
  let toRemove = document.getElementById(`p_${userId}`);
  toRemove.parentNode.removeChild(toRemove);
  let videoRemove = document.getElementById(`v_${userId}`);
  if(videoRemove) videoRemove.parentNode.removeChild(videoRemove);
  } catch(err) {
    alert(err);
  }
}

const raiseLowerHand = () => {

  if (handRaised) {
    document.getElementById("raisehandButton").style.color = "black";
    socket.emit('hand-lowered', {userId: myUserId, username: USER_NAME});
  } else {
    document.getElementById("raisehandButton").style.color = "white";
    socket.emit('hand-raised', {userId: myUserId, username: USER_NAME});
  }
  handRaised = !handRaised;
}

const lowerHand = (userId, username) => {
  let participant = document.getElementById(`p_${userId}`);
  participant.innerHTML = '<i style="font-size:14px;" class="fas fa-user-alt"></i> ' + username;
}

const raiseHand = (userId, username) => {
  let participant = document.getElementById(`p_${userId}`);
  participant.innerHTML = '<i style="font-size:14px;" class="fas fa-user-alt"></i> ' + username + ' <i style="font-size:14px;" class="fas fa-hand-paper"></i>';
  let rh = document.createElement('div');
  rh.innerHTML = `<div class="alert bg-dark-alert">${username} raised hand</div>`;
  rh.id = userId + 'rh';
  rh.className = 'rh';
  document.getElementsByTagName('body')[0].appendChild(rh);
  $(`#${userId}rh`).fadeTo(2000, 0);
  setTimeout(function(){
    $(`#${userId}rh`).remove();
  }, 2000);
}

var modal = document.getElementById("myModal");

const shareMeet = () => {
  console.log("clicked");
  modal.style.display = "block";
  var text = document.getElementById("shareLinkText");
  text.style.display = 'block';
  text.value = window.location.href;
  text.select();
  document.execCommand("copy");
  text.style.display = 'none';
}

function check(){
  console.log("here");
}
// document.getElementById("papa").addEventListener("click", function(){
//   console.log("pressed");
// });
// document.getElementById("micButton").addEventListener("click", function(){
//   console.log("pres");
//   muteUnmute();
// });
// document.getElementById("videoButton").addEventListener("click", playStop);
// document.getElementById("chatButton").addEventListener("click", openCloseChats);
// document.getElementById("participantsButton").addEventListener("click", openCloseParticipants);

// document.getElementById("raisehandButton").addEventListener("click", raiseLowerHand);
// document.getElementById("shareButton").addEventListener("click", shareMeet);

document.getElementById("modalCloseButton").addEventListener("click", () => {
  modal.style.display = "none";
});

window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}


