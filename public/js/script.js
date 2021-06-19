const socket = io();

const videoGrid = document.getElementById('video-grid');
const myVideo = document.createElement('video');
myVideo.muted = true;
let myUserId = "";

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
  addVideoStream(myVideo, stream, myUserId);

  peer.on('call', call => {
    call.answer(stream);
    const video = document.createElement('video');
    call.on('stream', userVideoStream => {
      addVideoStream(video, userVideoStream);
    });
  });

  socket.on('user-connected', (userId) => {
    console.log(`connected ${userId}`)
    connectToNewUser(userId, stream)
  });

  let text = $('#chat_message');

  $('html').keydown(event => {
    if (event.which == 13 && text.val().length != 0) {
      socket.emit('message', { message: text.val(), username: USER_NAME, userId: myUserId });
      text.val('');
    }
  });

  socket.on('create-message', data => {
    if (data.userId == myUserId)
      $('.messages').append(`<li class="message"><b>You</b><br/>${data.message}</li>`);
    else
      $('.messages').append(`<li class="message"><b>${data.username}</b><br/>${data.message}</li>`);
    scrolltoBottom();
  });
})
.catch(() => {
  myVideoStream = null
});

peer.on('open', id => {
  myUserId = id;
  socket.emit('join-room', ROOM_ID, id);
});

const connectToNewUser = (userId, stream) => {
  const call = peer.call(userId, stream);
  const video = document.createElement('video');
  call.on('stream', userVideoStream => {
    addVideoStream(video, userVideoStream)
  });
}

const addVideoStream = (video, stream) => {
  video.srcObject = stream;
  video.addEventListener('loadedmetadata', () => {
    video.play();
  });
  // video.id = userId;
  try {
    alert('uwu');
    let videoRows = videoGrid.getElementsByClassName('video-row');
    let numRows = videoGrid.getElementsByClassName('video-row').length;
    if (videoRows == undefined || numRows == 0 || videoRows[numRows - 1].getElementsByTagName('video').length == 3) {
      var videoRow = document.createElement('div');
      videoRow.className = 'video-row';
      videoRow.append(video);
      videoGrid.append(videoRow);
      alert('here');
      // videoGrid.append(video);
    } else {
      videoRows[numRows - 1].append(video);
      alert('there');
      // videoGrid.append(video);
    }
  } catch(err) {
    alert(err);
  }
  // try {
  //   document.getElementById('video-row').append(video);
  // } catch(err) {
  //   console.log(err);
  // }
  
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
    <i class="fas fa-microphone"></i>
  `
  document.querySelector('.main_mute_button').innerHTML = html;
}

const setUnmuteButton = () => {
  const html = `
    <i class="unmute fas fa-microphone-slash"></i>
  `
  document.querySelector('.main_mute_button').innerHTML = html;
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
    <i class="fas fa-video"></i>
  `
  document.querySelector('.main_video_button').innerHTML = html;
}

const setPlayVideo = () => {
  const html = `
    <i class="stop fas fa-video-slash"></i>
  `
  document.querySelector('.main_video_button').innerHTML = html;
}