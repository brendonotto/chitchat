// We import the CSS which is extracted to its own file by esbuild.
// Remove this line if you add a your own CSS build pipeline (e.g postcss).
import "../css/app.css"

// If you want to use Phoenix channels, run `mix help phx.gen.channel`
// to get started and then uncomment the line below.
// import "./user_socket.js"

// You can include dependencies in two ways.
//
// The simplest option is to put them in assets/vendor and
// import them using relative paths:
//
//     import "../vendor/some-package.js"
//
// Alternatively, you can `npm install some-package --prefix assets` and import
// them using a path starting with the package name:
//
//     import "some-package"
//

// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html"
// Establish Phoenix Socket and LiveView configuration.
import {Socket} from "phoenix"
import {LiveSocket} from "phoenix_live_view"
import topbar from "../vendor/topbar"

let csrfToken = document.querySelector("meta[name='csrf-token']").getAttribute("content")

let localStream
let users = {}

async function initStream() {
    try {
        // Gets our local media from the browser and stores it in a const, stream.
        const stream = await navigator.mediaDevices.getUserMedia({audio: true, video: true, width: "1280"})

        // Stores our stream in the global constant, localStream.
        localStream = stream

        // Sets out local video elemnt to stream from the user's webcam (stream).
        document.getElementById("local-video").srcObject = stream
    } catch (e) {
        console.log(e)
    }
}

function addUserConnection(userUuid) {
    if (users[userUuid] === undefined) {
        users[userUuid] = {
            peerConnection: null
        }
    }

    return users
}

function removeUserConnection(userUuid) {
    delete users[userUuid]

    return users
}

// lv       - Our LiveView hook's `this` object
// fromUser - The user to create the peer connection with
// offer    - Stores an SDP offer if it was passed to the function
function createPeerConnection(lv, fromUser, offer) {
    // Creates a variable for our peer connection to reference within
    // this function's scope
    let newPeerConnection = new RTCPeerConnection({
        iceServers: [
            { urls: "stun:myserver.com:3478" }
        ]
    })

    // Add this new peer connection to our `users` object.
    users[fromUser].peerConnection = newPeerConnection;

    // Add each local track to the RTCPeerConnection
    localStream.getTracks().forEach(track => newPeerConnection.addTrack(track, localStream))

    // If creating an answer, rather than an initial offer.
    if (offer !== undefined) {
        newPeerConnection.setRemoteDescription({type: "offer", sdp: offer})
        newPeerConnection.createAnswer()
            .then((answer) => {
                newPeerConnection.setLocalDescription(answer)
                console.log("Sending this ANSWER to the requester:", answer)
                lv.pushEvent("new_answer", {toUser: fromUser, description: answer})
            })
            .catch((err) => console.error(err))
    }

    newPeerConnection.onicecandidate = async ({candidate}) => {
        // fromUser is the new value for toUser because we're sending this data back
        // to the sender
        lv.pushEvent("new_ice_candidate", {toUser: fromUser, candidate})
    }

    // Don't add the `onnegotiationneeded` callback when creating an answer due to a bug
    // in Chrome's implementation of WebRTC
    if (offer === undefined) {
        newPeerConnection.onnegotiationneeded = async () => {
            try {
                newPeerConnection.createOffer()
                    .then((offer) => {
                        newPeerConnection.setLocalDescription(offer)
                        console.log("Sending this OFFER to the requester:", offer)
                        lv.pushEvent("new_sdp_offer", {toUser: fromUser, description: offer})
                    })
                    .catch((err) => console.error(err))
            }
            catch (error) {
                console.error(error)
            }
        }
    }

    // When the data is ready to flow, add it to the correct video.
    newPeerConnection.ontrack = async (event) => {
        console.log("Track received:", event)
        document.getElementById(`video-remove-${fromUser}`).srcObject = event.streams[0]
    }

    return newPeerConnection;
}

let Hooks = {}
Hooks.JoinCall = {
    mounted() {
        initStream()
    }
}
Hooks.InitUser = {
    mounted() {
        addUserConnection(this.el.dataset.userUuid)
    },

    destroyed() {
        removeUserConnection(this.el.dataset.userUuid)
    }
}
Hooks.HandleOfferRequest = {
    mounted() {
        console.log("new offer request from", this.el.dataset.fromUserUuid)
        let fromUser = this.el.dataset.fromUserUuid
        createPeerConnection(this, fromUser)
    }
}
Hooks.HandleIceCandidateOffer = {
    mounted () {
        let data = this.el.dataset
        let fromUser = data.fromUserUuid
        let iceCandidate = JSON.parse(data.iceCandidate)
        let peerConnection = users[fromUser].peerConnection

        console.log("new ice candidate from", fromUser, iceCandidate)

        peeroConnection.addIceCandidate(iceCandidate)
    }
}
Hooks.HandleSdpOffer = {
    mounted () {
        let data = this.el.dataset
        let fromUser = data.fromUserUuid
        let spd = data.sdp

        if (sdp != "") {
            console.log("new sdp OFFER from", data.fromUserUuid, data.sdp)

            createPeerConnection(this, fromUser, sdp)
        }
    }
}
Hooks.HandleAnswer = {
    mounted () {
        let data = this.el.dataset
        let fromUser = data.fromUserUuid
        let sdp = data.sdp
        let peerConnection = users[fromUser].peerConnection

        if (sdp != "") {
            console.log("new sdp ANSWER from", fromUser, sdp)

            peerConnection.setRemoteDescription({type: "answer", sdp: sdp})
        }
    }
}

let liveSocket = new LiveSocket("/live", Socket, {hooks: Hooks, params: {_csrf_token: csrfToken}})

// Show progress bar on live navigation and form submits
topbar.config({barColors: {0: "#29d"}, shadowColor: "rgba(0, 0, 0, .3)"})
window.addEventListener("phx:page-loading-start", info => topbar.show())
window.addEventListener("phx:page-loading-stop", info => topbar.hide())

// connect if there are any LiveViews on the page
liveSocket.connect()

// expose liveSocket on window for web console debug logs and latency simulation:
// >> liveSocket.enableDebug()
// >> liveSocket.enableLatencySim(1000)  // enabled for duration of browser session
// >> liveSocket.disableLatencySim()
window.liveSocket = liveSocket

