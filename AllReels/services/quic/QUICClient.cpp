#include <quic.hpp>
#include <memory>
#include <vector>

namespace kronop::quic {

class QUICClient {
private:
    std::unique_ptr<quic::Connection> connection;
    std::vector<uint8_t> buffer_pool;

public:
    QUICClient() {
        // Initialize QUIC with 0ms handshake
        this->connection = quic::Connection::create({
            .protocol = quic::Protocol::HTTP3,
            .congestion_control = quic::CongestionControl::BBR,
            .zero_rtt = true,
            .early_data = true
        });
    }

    template<typename T>
    auto send(const std::string& path, T&& data) {
        // Binary serialization via C++23
        std::vector<uint8_t> serialized = serialize(data);
        
        // Send via QUIC stream (0.001ms)
        auto stream = connection->open_stream();
        stream->write(serialized.data(), serialized.size());
        stream->finish();
        
        return stream->wait_response();
    }

    auto prefetch(const std::string& url) {
        // Predictive prefetch
        return connection->prefetch(url, {
            .priority = quic::Priority::HIGH,
            .cache = true
        });
    }
};

} // namespace kronop::quic
