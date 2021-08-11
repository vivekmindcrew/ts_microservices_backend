import { server } from './server'
import { CONFIGURATIONS } from './config'
import { db } from './db'
import { WSS_manager } from './wss'
import { internal_commutator } from './internal_commutator'
import { mq_manager } from './mq'
import inject_wss_to_send_consumed_shared_msg_handler from './handlers/inject_wss_to_send_consumed_shared_msg'

async function main() {
  // const internal_mq_manager = await mq_manager.init(CONFIGURATIONS.QUEUE.MQ_URI);

  await db.connect()

  server.listen(CONFIGURATIONS.SERVER.PORT)

  // const internal_wss_manager = new WSS_manager({
  //     options: CONFIGURATIONS.WSS
  // });

  // internal_commutator.register_wss(internal_wss_manager);

  // const q_id = await internal_mq_manager.sub_on_broadcast_messages_sharing(
  //     CONFIGURATIONS.QUEUE.SHARED_MESSAGES_EXCHANGE_NAME,
  //     inject_wss_to_send_consumed_shared_msg_handler(internal_wss_manager)
  // );

  // internal_commutator.apply_mq_interface(internal_mq_manager, q_id);
}

main()
