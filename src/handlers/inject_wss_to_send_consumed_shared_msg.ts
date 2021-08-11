import {WSS_manager} from '../wss';
import {shared_broadcast_message_payload} from "../mq/types";

export default (wss_manager: WSS_manager) =>
    ({user_to_notify, message}: shared_broadcast_message_payload) =>
        wss_manager.send_broadcast_message({user_to_notify, payload: message})
